"use strict";


var fs = require('fs');
var Queue = require('./queue.js').Queue

var println = function(arg) { console.log(arg); };
/**
 * PutStuffHere
 * @constructor
 */
var PutStuffHere = function() {
	this.queues = {};
	this.currentlyChaining = '';
	this.html = {};

	this.shouldExtractBody = true;

	var regex = /([\s\W])(?:(?:put|insert)\s+(.+?)\s+here)([\W\s])/gi;
	var cache = {};

	this.compile = function(template) {
		var self = this;

		if (cache[template]) {
			return cache[template];
		}

		console.log('compiling new.                  ');
		var string = 'return "' + template
			.replace(/"/g, "\\\"")
			.replace(/\n/g, "\\\n")
			.replace(regex, "$1\" + ctx.$2 +  \"$3")
			+ '";';

		println(string);
		var func = new Function('ctx', string);

		cache[template] = func;

		return func;
	};
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

	var finished = function() {
		// Run the queues
		for (var j = 0; j < self.queues[src].length; j++) {
			self.queues[src][j].flush(this);	
		}
		
		// Then delete the queue.
		self.queues[src] = [];

		// And forget our current chain.
		self.currentlyChaining = '';

		self.compile(self.html[src]);
	};

	// In the browser...
	if (typeof document !== 'undefined') {
		var obj = document.createElement('object');
		obj.setAttribute('width', 0);
		obj.setAttribute('height', 0);
		obj.addEventListener('load', function(e) {
			self.html[src] = obj.contentDocument
				.documentElement
				.getElementsByTagName("body")[0]
				.innerHTML
				.replace(/^\s*/, '')
				.replace(/\s*$/, '');
			finished();
		});
		obj.setAttribute('data', src);
		document.body.appendChild(obj);
	} else if (typeof fs !== 'undefined') {
		// Or in Node.js, or any context capable of loading fs
		fs.readFile(__dirname + '/' + src, function(err, data){
			if (Buffer.isBuffer(data)) { 
				var html = data.toString('utf8');

				if (self.shouldExtractBody) {
					if (html.match(/<body[^>]+>/i)) {
						html = html
							.replace(/^[\s\S]*?<body[^>]+>\s*/i, '')
							.replace(/\s*<\/body>[\s\S]*$/i, '');
					}
				}

				self.html[src] = html;
			}
			finished();
		});
	} else {
		console.log("Operating outside of Node or Browser context. Not sure where I am!");
	}
	return this;
};

/**
 * Print HTML
 * @param {String} src The src of the HTML
 */
PutStuffHere.prototype.printHTML = function() {
	var self = this;

	var actuallyPrint = function(resp) {
		console.log(resp);
		console.log("Printing HTML •••••••••••• ");
		console.log(self.html[self.currentlyChaining]);
	}

	if (typeof self.html[self.currentlyChaining] !== 'undefined') {
		actuallyPrint();
		return this;
	} else {
		self.queues[self.currentlyChaining][self.queues[self.currentlyChaining].length - 1].add(actuallyPrint);
	}
	return this;
};

/**
 * Template HTML
 * @param {String} src The src of the HTML
 */




var aThing = new PutStuffHere();
console.log("word <------------");
aThing.readHTML('../../templates/index.html').printHTML();
// aThing.readHTML('../templates/index.html').printHTML();





var module = module || {};
module.exports = module.exports || {};
module.exports = PutStuffHere;