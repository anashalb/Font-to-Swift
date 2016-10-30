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

	function isDirectory(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
	}

	function isFile(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isFile();
	}

	function getFileName(headers, url) {

		var contentDisposition = headers['content-disposition'];

		if (contentDisposition) {

			var matches = contentDisposition.match(/filename="(.*)"/);

			if (matches.length > 1) {
				return matches[1];
			}
		}

		var contentType = headers['content-type'].split('/')[1];
		var name = path.basename(url) || "fontfile";

		return name;
	}

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

	function isFontFile(fileName) {

		var validFontFiles = [".otf", ".ttf"];
		var extension = path.extname(fileName);
		return validFontFiles.indexOf(extension) >= 0;
	}

	function convert(inPath, outPath) {

		var pathPromise;

		pathPromise = new Promise(function(resolve, reject) {

			if (isDirectory(inPath)) {

				outPath = outPath || inPath;

				resolve(fontFilePathsInDirectory(inPath));

			} else if (isFile(inPath) && isFontFile(inPath)) {

				outPath = outPath || path.dirname(inPath);
				resolve([inPath]);

			} else {

				if (url.parse(inPath)) {

					downloadFont(inPath, outPath).then(function(location) {

						if (isDirectory(location))
							resolve(fontFilePathsInDirectory(location));
						else
							resolve(location);
					});
				}
			}

		}).then(function(pathsArray) {

			if (pathsArray.length > 0) {

				var plist = createFontsPlist(pathsArray);
				var plistPath = path.normalize(path.join(outPath, "fonts.plist"));

				fs.writeFile(plistPath, plist, (err) => {

					console.log("Plist written to " + plistPath);
					generate(pathsArray, outPath);
				});
			} else {
				console.log("Can't find any font files to convert :(");
			}
		});
	}

	function downloadFont(url, outPath) {

		console.log("\nDownloading from " + url + "...");

		return new Promise(function(resolve, reject) {

			var r = request(url);
			var fileName;
			var contentType;
			var filePath;
			var length = 0;

			r.on('response', function(res) {

				contentType = res.headers['content-type'].split('/')[1];
				fileName = getFileName(res.headers, url);
				filePath = path.join(outPath, fileName);
				res.pipe(fs.createWriteStream(filePath));

			}).on('end', function(res) {
				
				console.log("\n");

				if (contentType == 'zip') {

					fs.createReadStream(filePath).pipe(unzip.Extract({
						path: outPath
					}).on('close', function() {
						resolve(outPath);
					}));
				} else {
					resolve(outPath);
				}

			}).on('data', function(data) {

				length += data.length;
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write((length / 1000) + " KB");
			});
		});
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
					console.log(e);
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