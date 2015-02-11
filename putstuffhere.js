"use strict";
"use utf8";
/**
 * @summary PutStuffHere.js is a plain-English caching template system
 * @author <a href="mailto:ben@bensyverson.com">Ben Syverson</a>
 * @version 0.1
 * @copyright © Copyright 2015 Ben Syverson
 * @license The MIT License (MIT)
 * Copyright (c) 2015 Ben Syverson
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var require = require || function(){};

var isBrowser = (typeof window !== 'undefined');
var fs = require('fs');

var _Queue = require('./queue.js');
var Queue = Queue || (_Queue ? _Queue.Queue : null);

var orgstuffhereNull = '___•••NULL•••___';

String.prototype.orgstuffhereEscape = function() {
	return this.replace(/&/g, '___•••amp•••___')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/'/g, '&apos;')
				.replace(/"/g, '&quot;')
				.replace(/'___•••amp•••___'/g, '&amp;');
};

var println = function(arg) { console.log(arg); };
/**
 * PutStuffHere
 * @constructor
 */
var PutStuffHerePrivate = function() {
	this.queues = {};
	this.currentlyChaining = '';
	this.html = {};
	this.html[orgstuffhereNull] = "<div></div>";

	this.shouldExtractBody = true;

	var regex = /([\s\W])(?:(?:put|insert)\s+(.+?\S)(?:\s*\(([^)]+)\))?\s+here)([\W\s])/gi;
	var cache = {};

	var rendered = '';

	var wrapVars = function(m, p1,p2,p3,p4) {
		var varName = p2;
		if (typeof p3 !== 'undefined') {
			if (!p3.match(/unescaped/i)) {
				var parens = p3.split(/\s/);
				for (var j = 0; j < parens.length; j++) {
					varName += '.' + parens[j] + '()';
				}
			}
		} else {
			varName += '.orgstuffhereEscape()';
		}
		return '' + p1 + "\" + ('" + p2 + "' in ctx ? ctx." + varName + " : '') +  \"" + p4;
	};

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

	this.run = function(cb) {
		var self = this;
		var performCallback = function() {
			cb(null, self.rendered());
		};

		self.enqueue(performCallback);
		return this;
	};

	this.returnFunction = function(cb) {
		var self = this;
		var src = self.currentlyChaining;
		var performCallback = function() {
			cb(null, self.compile(src));
		};

		self.enqueue(performCallback);
		return this;
	};

	this.compileText = function(text) {
		var template = text;
		var string = 'return "' + template
			.replace(/"/g, "\\\"")
			.replace(/\n/g, "\\\n")
			.replace(regex, wrapVars)
			+ '";';

		var func = new Function('ctx', string);
		return func;
	};

	this.compile = function(src) {
		var self = this;
		if (typeof cache[src] === 'undefined') {
			var func = self.compileText(self.html[self.currentlyChaining] || "<div></div>");
		}

		return cache[src];
	};

	this.template = function(locals) {
		var self = this;
		var src = self.currentlyChaining;

		var doTemplate = function() {
			rendered = self.compile(src)(locals);
		};

		self.enqueue(doTemplate);

		return this;
	};

	this.getTemplateFunction = function(src, cb) {
		var self = this;
		return self.readHTML(src)
			.returnFunction(cb);
	};

	this.view = function(src, locals, cb) {
		var self = this;
		return self.readHTML(src)
			.template(locals)
			.eventually(cb);
	};
};

/**
 * Set Default HTML
 * @param {String} src The src of the HTML
 */
PutStuffHerePrivate.prototype.setDefaultHTML = function(aString) {
	var self = this;
	self.html[orgstuffhereNull] = aString;
	println("Setting " + orgstuffhereNull + " to " + aString);
}

/**
 * read HTML
 * @param {String} src The src of the HTML
 */
PutStuffHerePrivate.prototype.readHTML = function(src) {
	var self = this;

	// WARNING:
	// Because of this, chains can only be added in synchronous methods.
	self.currentlyChaining = src || orgstuffhereNull;

	// If we already have the answer, then return immediately.
	if ((!src) || (self.html[src])) {
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
		self.compile(src);

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
			obj.parentElement.removeChild(obj);
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

var PutStuffHere = (function () {
	var instance = null;
	return {
		shared: function () {
			if ( instance === null ) {
				instance = new PutStuffHerePrivate();
			}
			return instance;
		}
	};
})();

var module = module || {};
module.exports = module.exports || {};
module.exports = PutStuffHere;
