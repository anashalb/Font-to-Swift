# Font-to-Swift

A Node.js module to generate files necessary to get you up and running with custom fonts in your existing Swift Xcode project. You also have the option of generating an enumeration of the character mapping; this is particulary useful when it comes to using icon font files (eg. FontAwesome), where each unicode character represents an icon. Fancy a Google font (or any other web-hosted font file for that matter)? Pass the link to Font-To-Swift and it will automatically download the file, unzip it if necessary and generate the files.

*.ttf and .otf are currently supported.*

**Note:** This module is still under development. 


# Installation

### 1- Install Node.js

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
To generate a Swift and plist files for the font open-sans.ttf
```
fontToSwift open-sans.ttf /output/path
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

Similary, you can use 

```
fontToSwift /path/to/font/files /output/path
```

or

```
fontToSwift https://fonts.google.com/download?family=Open+Sans /output/path
```

All you need to do now is copy the generated Swift files and font files to your Xcode project. Make sure you include them in the required target(s).
Open fonts.plist and copy the node "UIAppFonts" into your plist file.

If you decided to use the [**e**](#options) option, you can get the unicode character for an icon using:
```
var label = UILabel();
label.font = FontAwesome.font(ofSize: 20);
label.text = FontAwesome.CharMap.Thumbs_up_alt.rawValue;
```


# To Do
- [ ] Embed files directly into an Xcode project

# License and Copyright
Copyright 2016 Anas Halbawi. All rights reserved.

[MIT License](http://en.wikipedia.org/wiki/MIT_License)