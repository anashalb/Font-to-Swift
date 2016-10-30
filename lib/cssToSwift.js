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

	function isDirectory(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
	}

	function isFile(path) {

		return fs.existsSync(path) && fs.lstatSync(path).isFile();
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

						resolve(fontFilePathsInDirectory(location));
					});
				}
			}

		}).then(function(pathsArray) {

			var plist = createFontsPlist(pathsArray);

			var plistPath = path.normalize(path.join(outPath, "fonts.plist"));

			fs.writeFile(plistPath, plist, (err) => {

				generate(pathsArray, outPath);
			});
		});
	}

	function downloadFont(url, outPath) {

		console.log("\nDownloading from " + url + "...");

		return new Promise(function(resolve, reject) {

			var r = request(url);
			var zipName;
			var length = 0;

			r.on('response', function(res) {
  				
				zipName = './fontFile.' + res.headers['content-type'].split('/')[1];
				res.pipe(fs.createWriteStream(zipName));

			}).on('end', function(res) {
				
				console.log("\n");

				fs.createReadStream(zipName).pipe(unzip.Extract({
					path: outPath
				}).on('close', function() {
					resolve(outPath);
				}));
			}).on('data', function(data) {

				length += data.length;
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write((length/1000) + " KB");
			});
		});
	}

	function generate(filePaths, outPath) {

		if (filePaths.length == 0) {
			return;
		}

		console.log("\nGenerating File\n----------------");

		var filePath = filePaths.splice(0, 1);
		var gen = new Generator(filePath[0], outPath);

		gen.generate(function() {

			generate(filePaths, outPath);
		});
	}

	//Plist creation
	function createFontsPlist(fontNames) {

		var plistString = "";
		plistString += "<key>UIAppFonts</key>\n";
		plistString += "<array>\n";

		for (var i in fontNames) {

			var fontName = path.basename(fontNames[i]);
			plistString += "\t<string>" + fontName + "</string>\n";
		}

		return plistString += "<array>\n";
	}

	function Generator(inPath, outPath) {

		this.inPath = inPath;
		this.outPath = outPath; //Must be a directory
		this.fontName = "";
		this.fontFamily = "";
		this.fontSubfamily = "";
		this.fontClassName = "";
		this.fontEnumName = "";
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
					self.fontEnumName = self.createSafeVariable(self.fontName) + "Enum";
					self.fontFamily = f.names.fontFamily.en;
					self.fontSubfamily = f.names.fontSubfamily.en;

					var glyphs = f.glyphs.glyphs;

					for (var i in glyphs) {

						var glyph = glyphs[i];
						var unicode = glyph.unicode;

						if (unicode) {
							var glyphName = self.createSafeVariable(glyph.name);
							self.charMap[glyphName] = glyph.unicode;
						}
					}
				}

				callback();
			});
		},

		writeOutput: function(output, callback) {

			var outputFullPath = path.normalize(path.join(this.outPath + "/" + this.fontClassName + ".swift"));

			console.log("Writing to file at path: " + outputFullPath + "...");

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

			var body = [this.fontNameDeclaration(), this.generateFontEnum(), this.generateFunction()].join("\n\n").indent(1);
			return this.encapsulateInSwiftClass(body);
		},

		generateFunction: function() {

			var func = "";

			func += "func fontFile(size:CGFloat) -> UIFont? {\n"
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

			fontDec += "let fontName: String = \"" + this.fontName + "\"\n";
			fontDec += "let fontFamily: String = \"" + this.fontFamily + "\"\n";
			fontDec += "let fontSubfamily: String = \"" + this.fontSubfamily + "\"";

			return fontDec;
		},

		encapsulateInSwiftClass: function(string) {

			return [this.swiftHeader(), string, this.swiftFooter()].join("\n\n");
		},

		swiftHeader: function() {

			var today = new Date();

			var string = "//\n";
			string += "//  " + this.fontClassName + ".swift\n";
			string += "//  RealTimeTodo\n";
			string += "//\n";
			string += "//  Automatically generated by CSSToSwift on " + today.shortDateFormat() + ".\n";
			string += "//  Copyright © " + today.getFullYear() + " CSSToSwift. All rights reserved.\n";
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