"use strict";

var isBrowser = (typeof window !== 'undefined');
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

	var rendered = '';

	this.enqueue = function(aFunc) {
		var self = this;

		if (typeof self.html[self.currentlyChaining] !== 'undefined') {
			aFunc();
			return this;
		} else {
			self.queues[self.currentlyChaining][self.queues[self.currentlyChaining].length - 1].add(aFunc);
		}
	};

	this.rendered = function() {
		var self = this;
		return rendered;
	}

	this.eventually = function(cb) {
		var self = this;
		var performCallback = function() {
			cb(null, self.rendered());
		};

		self.enqueue(performCallback);
		return this;
	};

	this.compile = function(src, template) {
		var self = this;

		var string = 'return "' + template
			.replace(/"/g, "\\\"")
			.replace(/\n/g, "\\\n")
			.replace(regex, "$1\" + ctx.$2 +  \"$3")
			+ '";';

		var func = new Function('ctx', string);

		println('*********** COMPILED: ' + src);
		cache[src] = func;

		return func;
	};

	this.template = function(locals) {
		var self = this;
		var src = self.currentlyChaining;

		var doTemplate = function() {
			if (cache[src] === 'undefined') {
				var html = self.html[src];
				self.compile(src, html);
			}
			rendered = cache[src](locals);
		};

		self.enqueue(doTemplate);

		return this;
	};

	this.view = function(src, locals, cb) {
		var self = this;
		return self.readHTML(src)
			.template(locals)
			.eventually(cb);
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

		// Set context back to src (could have been reset during loading of another template.)
		self.currentlyChaining = src;

		// Compile the template
		self.compile(src, self.html[src]);

		// Run the queues
		for (var j = 0; j < self.queues[src].length; j++) {
			self.queues[src][j].flush(this);	
		}
		
		// Then delete the queue.
		self.queues[src] = [];

		// And finally, reset our current chain.
		self.currentlyChaining = '';

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
		println("Operating outside of Node or Browser context. Not sure where I am!");
	}
	return this;
};



var aThing = new PutStuffHere();
console.log("word <------------");

aThing.view('../../templates/red.html', {subviews: 'Red'}, function(err, value) {
	println("RED:");
	println(value);
});
aThing.view('../../templates/blue.html', {subviews: 'Blue'}, function(err, value) {
	println("BLUE:");
	println(value);
});
aThing.view('../../templates/red.html', {subviews: 'Red'}, function(err, value) {
	println("RED:");
	println(value);
});
aThing.view('../../templates/blue.html', {subviews: 'Blue'}, function(err, value) {
	println("BLUE:");
	println(value);
});




var module = module || {};
module.exports = module.exports || {};
module.exports = PutStuffHere;