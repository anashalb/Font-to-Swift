/* Utils Class*/

(function(){

	Date.prototype.shortDateFormat = function() {

		var date = this.getDate() + '/' + (this.getMonth() + 1) + '/' + this.getFullYear();
		return date;
	};

	String.prototype.indent = function(numOfIndents, opt_spacesPerIndent) {
		
		var str = this.replace(/^(?=.)/gm, new Array(numOfIndents + 1).join('\t'));
		numOfIndents = new Array(opt_spacesPerIndent + 1 || 0).join(' '); // re-use

		return opt_spacesPerIndent ? str.replace(/^\t+/g, function(tabs) {
			return tabs.replace(/./g, numOfIndents);
		}) : str;
	}

}());