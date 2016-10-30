# Font-to-Swift

A Node.js module to generate files necessary to get you up and running with custom fonts in your existing Swift Xcode project. You also have the option of generating an enumeration of the character mapping; this is particulary useful when it comes to using icon font files (eg. FontAwesome), where each unicode character represents an icon. Fancy a Google font (or any other web-hosted font file for that matter)? Pass the link to Font-To-Swift and it will automatically download the file, unzip it if necessary and generate the files.

*.ttf and .otf are currently supported.*

**Note:** This module is still under development. 


# Installation

##@ 1- Install Node.js

Make sure you have Node.js installed on your Mac.

To check if you already do, fire up your terminal and run:
```
node -v
```

You should get something like "v4.5.0"


### 2- Install Font-to-Swift module (globally!)

To make use of this module, install it globally using npm:

```
npm install -g font-to-swift
```

If you get an EACCES error, you should [fix your permissions](https://docs.npmjs.com/getting-started/fixing-npm-permissions). You could also try using sudo, but this is discourage:
```
sudo npm install -g font-to-swift
```

# Usage
To use this module:
```
fontToSwift [options] directory of font files | font file name | downloadable link to font [output directory]
```

#### Options
**-e** Generates an enumeration of all the characters in the font file.


###Example:
```
fontToSwift open-sans.ttf .
```

Generates the following files:
* OpenSans.swift
* fonts.plist

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