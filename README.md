# Font-to-Swift

A Node.js library to generate Swift code and a plist file from a font(s) ready to be plugged into your existing Xcode project.

# Installation

## 1- Install Node.js

Make sure you have Node.js installed on your Mac.

To check if you have Node.js installed, fire up your terminal and run
```
node -v
```

You should get something like v4.5.0


# 2- Install Font-to-Swift package (globally)

To make use of this package, install it globally using npm

```
npm install -g font-to-swift
```

If you get an EACCES error, you should [fix your permissions](https://docs.npmjs.com/getting-started/fixing-npm-permissions). You could also try using sudo, but this should be avoided:
```
sudo npm install -g font-to-swift
```