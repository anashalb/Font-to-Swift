#!/usr/bin/env node

(function() {

	var path = require('path');
	var cssToSwift = require('../lib/cssToSwift');
	var fs = require('fs');

	function getPath(inPath) {

		if (inPath.startsWith("http")) return inPath;

		if (inPath.charAt(0) != '/') {

			var directory = ".";
			return path.normalize(path.join(directory, inPath));
		} else {
			return inPath;
		}
	}

	if (!process.argv[2]) {

		console.log("Error: Please specify an input file name or a directory.");
	} else {

		var inPath = getPath(process.argv[2]);
		var outPath = process.argv[3];

		if (outPath) {

			if (!fs.existsSync(outPath) || !fs.lstatSync(outPath).isDirectory()) {
				console.log("Error: The output " + outPath + " is not a valid directory.");
				return;
			}
		} else {

			if (fs.existsSync(inPath)) {

				if (fs.lstatSync(inPath).isDirectory()) {
					outPath = inPath;
				} else {
					outPath = path.dirname(inPath);
				}
			} else {

				outPath = ".";
			}
		}

		cssToSwift(inPath, outPath);
	}

}());