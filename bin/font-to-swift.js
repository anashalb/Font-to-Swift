#!/usr/bin/env node

(function() {

	var path = require('path');
	var fontToSwift = require('../lib/fontToSwift');
	var fs = require('fs');
	var args = require('minimist')(process.argv.slice(2));
	var promise = require('promise');

	//Only argument necessary for running is either a path to a file, a directory or a URL to download from
	if (!args['_'][0]) {

		console.log("Error: Please specify an input file name or a directory.");
	} else {

		var inPath = args['_'][0];	//File, directory or url
		var outPath = args['_'][1];	//Must be a directory


		if (outPath) {	//Validate the output directory

			if (!fs.existsSync(outPath) || !fs.lstatSync(outPath).isDirectory()) {
				console.log("Error: The output " + outPath + " is not a valid directory.");
				return;
			}
		} else {	//No directory: set the output directory to the input directory, or to the current directory if a URL is passed

			if (fs.existsSync(inPath)) {

				if (fs.lstatSync(inPath).isDirectory()) {	//Input is a directory
					outPath = inPath;
				} else {
					outPath = path.dirname(inPath);	//Input is a file
				}
			} else {	//URL

				outPath = ".";
			}
		}

		fontToSwift(inPath, outPath).then(function() {

		}, function(e){

			console.log(e);
		});
	}
}());