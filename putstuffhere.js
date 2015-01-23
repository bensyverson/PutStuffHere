"use strict";


var fs = require('fs');
var Queue = require('./queue.js').Queue


/**
 * PutStuffHere
 * @constructor
 */
var PutStuffHere = function() {
	this.queues = {};
	this.currentlyChaining = '';
	this.html = {};
};

/**
 * read HTML
 * @param {String} src The src of the HTML
 */
PutStuffHere.prototype.readHTML = function(src) {
	var self = this;

	// WARNING:
	// Because of this, chains can only be added in synchronous methods.
	self.currentlyChaining = src;

	// If we already have the answer, then return immediately.
	if (self.html[src]) {
		return this;
	}

	// Otherwise, let's setup a queue.
	var queue = new Queue();

	// It's possible that some other queue is already waiting for this HTML.
	if (typeof self.queues[src] === 'undefined') {
		self.queues[src] = [];
	}

	// Add our queue
	self.queues[src].push(queue);

	// If we're already fetching this, let's chill
	if (self.queues[src].length > 1) {
		return this;
	}

	// In the browser...
	if (typeof document !== 'undefined') {
		console.log("################### FETCHING NEW HTML");
		var obj = document.createElement('object');
		obj.setAttribute('width', 0);
		obj.setAttribute('height', 0);
		obj.addEventListener('load', function(e) {
			self.html = obj.contentDocument
				.documentElement
				.getElementsByTagName("body")[0]
				.innerHTML;

			// Run the queues
			for (var j = 0; j < self.queues[src].length; j++) {
				self.queues[src][j].flush(this);	
			}
			
			// Then delete the queue.
			self.queues[src] = [];

			// And forget our current chain.
			self.currentlyChaining = '';
		});
		obj.setAttribute('data', src);
		document.body.appendChild(obj);
	} else if (typeof fs !== 'undefined') {
		// Or in Node.js, or any context capable of loading fs

	} else {
		console.log("Operating outside of Node or Browser context. Not sure where I am!");
	}
	return this;
};

/**
 * Print HTML
 * @param {String} src The src of the HTML
 */
PutStuffHere.prototype.printHTML = function(src) {
	var self = this;

	var actuallyPrint = function(resp) {
		console.log(resp);
		console.log("Printing HTML •••••••••••• ");
		console.log(self.html);
	}

	if (typeof self.html[self.currentlyChaining] !== 'undefined') {
		actuallyPrint();
		return this;
	} else {
		self.queues[self.currentlyChaining][self.queues[self.currentlyChaining].length - 1].add(actuallyPrint);
	}
	return this;
};

var aThing = new Thing();
aThing.readHTML('../templates/index.html').printHTML();
// aThing.readHTML('../templates/index.html').printHTML();


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



var module = module || {};
module.exports = module.exports || {};
module.exports = {
	psh: psh
};