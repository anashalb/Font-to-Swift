# Font-to-Swift

A Node.js module to generate files necessary to get you up and running with custom fonts in your existing Swift Xcode project.

The file 


# Installation

## 1- Install Node.js

Make sure you have Node.js installed on your Mac.

To check if you already do, fire up your terminal and run
```
node -v
```

You should get something like "v4.5.0"


# 2- Install Font-to-Swift package (globally!)

To make use of this package, install it globally using npm

```
npm install -g font-to-swift
```

If you get an EACCES error, you should [fix your permissions](https://docs.npmjs.com/getting-started/fixing-npm-permissions). You could also try using sudo, but this should be avoided:
```
sudo npm install -g font-to-swift
```

# Usage
```
fontToSwift [-e] [directory of font files | font file name | downloadable link to font] [output path]
```
**-e** Generates an enumeration of all the characters in the font file. This is specifically useful when embedding an icons font file into your project.

Example:
```
fontToSwift open-sans.ttf .
```

Generates the following files:
*OpenSans.swift
*fonts.plist

where fonts.plist contains
```
<key>UIAppFonts</key>
<array>
	<string>open-sans.ttf</string>
<array>
```

# License and Copyright
Copyright 2016 Anas Halbawi. All rights reserved.

[MIT License](http://en.wikipedia.org/wiki/MIT_License)