(function() {

	require('./utils.js');

	const opentype = require('opentype.js');
	const promise = require('promise');
	const unzip = require('unzip2');
	const request = require('request');
	const process = require('process');
	const url = require('url');
	const path = require('path');
	const fs = require('fs');
	var args = require('minimist')(process.argv.slice(2));
	var packageJson = require('../package.json');


	/**
	 * Checks if the given path is a valid and existing directory
	 *
	 * @param  {String}  path The path to check
	 *
	 * @return {Boolean}      true if the path is a valid directory, false otherwise.
	 */
	function isDirectory(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
	}

	/**
	 * Checks if the given path is a valid and existing file
	 *
	 * @param  {String}  path The path to check
	 *
	 * @return {Boolean}      true if the path is a valid file, false otherwise.
	 */
	function isFile(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isFile();
	}

	/**
	 * Returns all the font files in the given directory
	 *
	 * @param  {String} dirPath A path to a valid directory
	 *
	 * @return {Array}          An array of all the paths to the font files in the given directory
	 */
	function fontFilePathsInDirectory(dirPath) {

		var files = fs.readdirSync(dirPath);
		var fontFilePaths = [];

		for (var i in files) {
			var fileName = files[i];

			if (isFontFile(fileName)) {
				var filePath = path.normalize(path.join(dirPath, fileName))
				fontFilePaths.push(filePath);
			}
		}

		return fontFilePaths;
	}

	/**
	 * Checks if the given filename is a valid font file.
	 *
	 * @param  {string}  fileName A filename with the extension
	 *
	 * @return {Boolean}          true if the given filename is a valid font file, false otherwise.
	 */
	function isFontFile(fileName) {

		var validFontFiles = [".otf", ".ttf"];
		var extension = path.extname(fileName);
		return validFontFiles.indexOf(extension) >= 0;
	}

	/**
	 * This function puts all the bits and pieces together.
	 *
	 * @param  {String} inPath  A file path, directory or URL to start the conversion process
	 * @param  {String} outPath The path to the output directory
	 */
	function convert(inPath, outPath) {

		var pathPromise;

		pathPromise = new Promise(function(resolve, reject) {

			if (isDirectory(inPath)) { //1- Directory: Get all the paths of the fonts in the given directory

				outPath = outPath || inPath;
				var paths = fontFilePathsInDirectory(inPath);
				if (paths.length > 0)
					resolve(paths);
				else 
					reject("Error: No valid font files in directory");

			} else if (isFile(inPath) && isFontFile(inPath)) { //2- Font file: Simple, we want to convert a single font

				outPath = outPath || path.dirname(inPath);
				resolve([inPath]);

			} else { //3- URL: A URL pointing to a zip file of font files or a single font file

				new Downloader().download(inPath, outPath).then(function(location) {

					if (isDirectory(location))
						resolve(fontFilePathsInDirectory(location));
					else
						resolve([location]);
				}, function(e) {
					reject(e);
				});
			}

		}).then(function(pathsArray) {

			if (pathsArray.length > 0) {

				var plist = createFontsPlist(pathsArray); //Generate the plist
				var plistPath = path.normalize(path.join(outPath, "fonts.plist"));

				fs.writeFile(plistPath, plist, (err) => {

					console.log("Plist written to " + plistPath);
					generate(pathsArray, outPath); //Generate all the Swift files
				});

			} else {
				throw("Can't find any valid [.ttf, .otf] font files to convert :(");
			}
		}, function(e) {

			throw e;
		});

		return pathPromise;
	}

	function generate(filePaths, outPath) {

		if (filePaths.length == 0) {
			return Promise.resolve();
		}


		var filePath = filePaths.splice(0, 1);
		var gen = new Generator(filePath[0], outPath);

		console.log("\nGenerating for", filePath[0], "\n----------------");

		gen.generate(function() {

			generate(filePaths, outPath);
		});
	}

	//Plist creation
	function createFontsPlist(fontNames) {

		var plistString = "";
		plistString += '<dict>\n';
		plistString += '<key>UIAppFonts</key>\n';
		plistString += '<array>\n';

		for (var i in fontNames) {

			var fontName = path.basename(fontNames[i]);
			plistString += '\t<string>' + fontName + '</string>\n';
		}

		plistString += "</array>\n";
		plistString += '</dict>\n';

		return plistString;
	}

	function Downloader() {

	}

	Downloader.prototype = {

		init: function(url, outPath) {

			this.url = url;
			this.outPath = outPath;
			this.amountDownloaded = 0;
			this.fileName = "";
			this.contentType = "";
			this.filePath = "";
		},

		download: function(url, outPath) {

			console.log("\nDownloading from " + url + "...");

			this.init(url, outPath);
			var self = this;

			return new Promise(function(resolve, reject) {

				if (!self.isValidURL(url)) {
					reject("Error: Invalid URL.");
				} else {
					var r = request(url);

					r.on('response', self.onResponse.bind(self));
					r.on('data', self.onDataReceived.bind(self));
					r.on('end', self.onCompletion.bind(self, resolve, reject));
					r.on('error', self.onError.bind(self, resolve, reject));
				}
			});
		},

		onResponse: function(response) {

			this.contentType = response.headers['content-type'].split('/')[1];
			this.fileName = this.getFileName(response.headers, this.url);
			this.filePath = path.join(this.outPath, this.fileName);
			response.pipe(fs.createWriteStream(this.filePath));
		},

		onDataReceived: function(data, resolve, reject) {

			this.amountDownloaded += data.length;
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write((this.amountDownloaded / 1000) + " KB");
		},

		onCompletion: function(resolve, reject) {

			console.log("\n");
			var self = this;

			if (this.contentType == 'zip') {

				fs.createReadStream(this.filePath).pipe(unzip.Extract({
					path: self.outPath
				}).on('close', function() {
					resolve(self.outPath);
				}).on('error', function() {
					reject('Error: Unable to extract files');
				}));

			} else {
				resolve(this.outPath);
			}
		},

		onError: function(resolve, reject, error) {
			reject('Error: ' + error.message);
		},

		isValidURL: function(stringURL) {

			var parsedURL = url.parse(stringURL);
			return (parsedURL.protocol == 'https:' || parsedURL.protocol == 'http:');
		},

		/**
		 * Parses the given headers and and URL to construct a valid and meaningful name.
		 * Priority goes to the Content-Disposition header, then the file name in the URL,
		 * and finally a static file name with the extension grabbed from the Content-Type.
		 *
		 * @param  {Object} headers The headers from the response object
		 * @param  {String} url     The URL from which the file is downloaded
		 *
		 * @return {String}         A valid file name, including an extension.
		 */
		getFileName: function(headers, url) {

			var contentDisposition = headers['content-disposition'];

			if (contentDisposition) {

				var matches = contentDisposition.match(/filename="(.*)"/);

				if (matches.length > 1) {
					return matches[1];
				}
			}

			var contentType = headers['content-type'].split('/')[1];
			var name = path.basename(url) || ("fontfile." + contentType);

			return name;
		}
	}

	function Generator(inPath, outPath) {

		this.inPath = inPath;
		this.outPath = outPath; //Must be a directory
		this.fontName = "";
		this.fontFamily = "";
		this.fontSubfamily = "";
		this.fontClassName = "";
		this.fontEnumName = "CharMap";
		this.charMap = {};
	}

	Generator.prototype = {

		generate: function(callback) {

			var self = this;

			this.readFontFile(this.inPath, function() {

				var swiftClass = self.createSwiftClass();
				self.writeOutput(swiftClass, function() {
					callback();
				});
			});
		},

		readFontFile: function(path, callback) {

			console.log("Reading file at", path + "...");

			var self = this;

			opentype.load(path, function(e, f) {

				if (e)
					throw e;
				else {

					self.fontName = f.names.fullName.en;
					self.fontClassName = self.createSafeVariable(self.fontName);
					self.fontFamily = f.names.fontFamily.en;
					self.fontSubfamily = f.names.fontSubfamily.en;

					var glyphs = f.glyphs.glyphs;

					for (var i in glyphs) {

						var glyph = glyphs[i];
						var unicode = glyph.unicode;

						if (unicode) {
							var name = glyph.name ? glyph.name : "u" + unicode;
							var glyphName = self.createSafeVariable(name);
							self.charMap[glyphName] = glyph.unicode;
						}
					}
				}

				callback();
			});
		},

		writeOutput: function(output, callback) {

			var outputFullPath = path.normalize(path.join(this.outPath + "/" + this.fontClassName + ".swift"));

			console.log("Writing to file at " + outputFullPath + "...");

			fs.writeFile(outputFullPath, output, (err) => {

				if (err) {
					throw err;
				} else {

					console.log('Swift file generated successfully!');
					callback();
				}
			});
		},

		/* Swift Generation Functions */
		createSwiftClass: function() {

			console.log("Generating Swift code...");

			var pieces = [];
			pieces.push(this.fontNameDeclaration());

			if (args.e)
				pieces.push(this.generateFontEnum());

			pieces.push(this.generateFunction());

			var body = pieces.join("\n\n").indent(1);
			return this.encapsulateInSwiftClass(body);
		},

		generateFunction: function() {

			var func = "";

			func += "static func font(ofSize size:CGFloat) -> UIFont? {\n"
			func += "\treturn UIFont.init(name: fontName, size: size);\n";
			func += "}";

			return func;
		},

		generateFontEnum: function() {

			var output = "enum " + this.fontEnumName + " : String {\n";

			for (var key in this.charMap) {

				output += "\tcase " + key + " = " + "\"\\u{" + this.charMap[key] + "}\";\n";
			}

			output += "}";

			return output;
		},

		fontNameDeclaration: function() {

			var fontDec = "";

			fontDec += "static let fontName: String = \"" + this.fontName + "\"\n";
			fontDec += "static let fontFamily: String = \"" + this.fontFamily + "\"\n";
			fontDec += "static let fontSubfamily: String = \"" + this.fontSubfamily + "\"";

			return fontDec;
		},

		encapsulateInSwiftClass: function(string) {

			return [this.swiftHeader(), string, this.swiftFooter()].join("\n\n");
		},


		swiftHeader: function() {

			var today = new Date();

			var string = "//\n";
			string += "//  " + this.fontClassName + ".swift\n";
			string += "//\n";
			string += "//  Automatically generated by FontToSwift v" + packageJson.version + " on " + today.shortDateFormat() + ".\n";
			string += "//  Copyright © " + today.getFullYear() + " FontToSwift. All rights reserved.\n";
			string += "//\n\n";

			string += "import UIKit\n\n";
			string += "class " + this.fontClassName + " : NSObject {";

			return string;
		},

		swiftFooter: function() {

			return "}";
		},

		/**
		 * Convert the given string to a CamelCase and safe Swift Class name
		 *
		 * @param string The input string to convert
		 * @return A CamelCase and safe Swift class name
		 */
		createSafeVariable: function(string) {

			string = string.replace(/(:.*$)|(\s)/g, '')
			string = string.replace(/(\W\w)/gi, function(s, i, e) {

				return s[1].toUpperCase();

			}).replace(/(\W)/g, '');

			string = string.substr(0, 1).toUpperCase() + string.substr(1);

			return string;
		},
	}

	module.exports = convert;

}());