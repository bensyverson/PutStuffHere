"use strict";


var psh = psh || (function(){

	var PutStuffHere = function() {
		var regex = /[\s\W]((?:put|insert)\s+(.+?)\s+here)[\W]/gi;

		var cache = {};

		this.compile = function(template) {
			var self = this;

			if (cache[template]) {
				return cache[template];
			}

			console.log('compiling new.');
			var string = 'return "' + template
				.replace(/"/g, "\\\"")
				.replace(regex, "\" + ctx.$2 +  \"")
				+ '";';

			var func = new Function('ctx', string);

			cache[template] = func;

 			return func;
		};


	};

	return new PutStuffHere();
})();

