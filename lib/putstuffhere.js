"use strict";

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

if (typeof(require) === typeof(undefined))  window.require = function(){return null;};
var println = println || function(arg) { console.log(arg); };

var isBrowser = (typeof window !== 'undefined');
var fs = isBrowser ? null : require('fs');

var OrgStuffHereQueue = OrgStuffHereQueue || require('./queue.js');
var PutStuffHereAjax = PutStuffHereAjax || require('./ajax.js');

/**
 * Extend String with an escape function
 * @method orgstuffhereEscape
 * @return {String}
 * @example
 * "I went to the café with no html tags.".orgstuffhereEscape() 
 *    // => "I went to the café with no html tags."
 * '<div id="Testing" alt="this&that;" />'.orgstuffhereEscape() 
 *    // => "&lt;div id=&quot;Testing&quot; alt=&quot;this&amp;that;&quot; /&gt;"
 * 'Pathological case: ___•••amp•••___copy;'.orgstuffhereEscape()
 *    // => "Pathological case: copy;"
 */
String.prototype.orgstuffhereEscape = function() {
	return this	.replace(/___•••[^•]+•••___/g, '')			// sanitize input
				.replace(/&/g, '___•••amp•••___')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/'/g, '&apos;')
				.replace(/"/g, '&quot;')
				.replace(/___•••amp•••___/g, '&amp;');
};

/**
 * Extend String with an escape function
 * @class PutStuffHerePrivate
 * @constructor
 * @examples
 * var psh = new PutStuffHerePrivate();
 * 
 * psh // => instanceof PutStuffHerePrivate
 */
var PutStuffHerePrivate = function() {
	this.queues = {};
	this.currentlyChaining = '';
	this.html = {};
	var orgstuffhereNull = '___•••NULL•••___';
	this.html[orgstuffhereNull] = "<div></div>";
	this.orgstuffhereNull = orgstuffhereNull;

	this.shouldExtractBody = true;
	
	// The main regex. This can and should be extended with other syntaxes.
	var regex = /([\s\W]|^)(?:(?:put|insert)\s+(.+?\S)(?:\s*\(([^)]+)\))?\s+here)([\W\s]|$)/gi;
	var cache = {};

	var rendered = '';


	/**
	 * Wrap variables
	 * @private
	 * @param {Array} m The match array
	 * @param {String} p1 The previous char
	 * @param {String} p2 The variable name
	 * @param {String} p3 A parenthetical (optional)
	 * @param {String} p4 The next char
	 * @returns {String} The string with variables wrapped
	 */

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
		return '' + p1 + "\" + (typeof ctx." + p2 + " !== typeof(undefined) ? ctx." + varName + " : '') +  \"" + p4;
	};

	var _templateRoot = '';
	this.setTemplateRoot = function(newValue) {
		_templateRoot = newValue;
	};

	this.templateRoot = function() {
		return _templateRoot;
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

 
	this.templateFunction = function(cb) {
		var self = this;
		var src = self.currentlyChaining;

		var performCallback = function() {
			cb(null, self.compile(src));
		};

		self.enqueue(performCallback);
		return this;
	};

	/**
	 * Wrap variables found with the Put Stuff Here regex
	 * @memberOf PutStuffHerePrivate
	 * @param {String} text A template
	 * @param {boolean} shouldCache Should we cache the function?
	 * @returns {Function} The compiled function
	 * @examples
	 * var psh = new PutStuffHerePrivate();
	 * var sub = psh.compileText("<p>put name here\nput subviews (unescaped) here</p>", false);
	 * var func = psh.compileText("<div>put stuff here\nput html (unescaped) here</div>", false);
	 * var lower = psh.compileText("<p>put uppercase (toLocaleLowerCase) here</p>", false);
	 * func // instanceof Function
	 * sub // instanceof Function
	 * lower // instanceof Function
	 * func({'stuff': 'something'})  // => "<div>something</div>"
	 * func({'stuff': '<p id="test">&amp;</p>'})  // => "<div>&lt;p id=&quot;test&quot;&gt;&amp;amp;&lt;/p&gt;</div>"
	 * func({'stuff': 'title', 'html': '<p id="test">&amp;</p>'})  // => '<div>title<p id="test">&amp;</p></div>'
	 * lower({'uppercase': 'CAFÉ STREETS'}) // => "<p>café streets</p>"
	 * sub({'name': 'A', 'subviews': '<B>'})  // => "<p>A<B></p>"
	 */
	this.compileText = function(text, shouldCache) {
		var self = this;
		if (typeof cache[text] !== typeof(undefined)) {
			return cache[text];
		}
		var template = text || self.html[self.orgstuffhereNull];

		var string = 'return "' + template
			.replace(/"/gm, "\\\"")
			.replace(/\r?\n|\r/g, "\\\n")
			.replace(regex, wrapVars)
			+ '";';

		var func = new Function('ctx', string);
		if (shouldCache) {
			cache[text] = func;
		}
		return func;
	};


	this.compile = function(src) {
		var self = this;
		src = src.replace(/#[^#\/]+$/, '');
		
		if (typeof cache[src] === 'undefined') {
			var func = self.compileText(self.html[self.currentlyChaining] || self.html[self.orgstuffhereNull]);
			cache[src] = func;
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

	this.getHTML = function(src, cb) {
		var self = this;
		return self.readHTML(src)
					.htmlValue(cb);
	};

	this.getTemplateFunction = function(src, cb) {
		var self = this;
		return self.readHTML(src)
					.templateFunction(cb);
	};
};

PutStuffHerePrivate.prototype.enqueue = function(aFunc) {
	var self = this;

	if (typeof(self.html[self.currentlyChaining]) !== typeof(undefined)) {
		aFunc();
		return self;
	} else {
		var lastIndex = self.queues[self.currentlyChaining].length - 1;
		self.queues[self.currentlyChaining][lastIndex].add(aFunc);
	}
};

/**
 * Get HTML Value
 * @memberOf PutStuffHerePrivate
 * @param {Function} cb The callback function
 * @returns {PutStuffHerePrivate} 
 * @examples
 * var psh = new PutStuffHerePrivate();
 * 
 * psh.readHTML('mock', true).htmlValue(callback);  // calls callback 1 time asynchronously
 */
PutStuffHerePrivate.prototype.htmlValue = function(cb) {
	var self = this;
	var src = self.currentlyChaining;

	var performCallback = function() {
		cb(null, self.html[src]);
	};

	self.enqueue(performCallback);
	return this;
};



/**
 * Set the default HTML
 * @memberOf PutStuffHerePrivate
 * @examples
 * //var psh = new PutStuffHerePrivate();
 * //psh.setDefaultHTML('<p></p>');
 * //psh.html[psh.orgstuffhereNull] // => '<p></p>'
 */
PutStuffHerePrivate.prototype.setDefaultHTML = function(aString) {
	var self = this;
	self.html[self.orgstuffhereNull] = aString;
}


PutStuffHerePrivate.prototype.extractBody = function(html) {
	var self = this;
	if (html.match(/<body[^>]*>/i)) {
		html = html
			.replace(/^[\s\S]*?<body[^>]*>\s*/i, '')
			.replace(/\s*<\/[\s]*body>[\s\S]*$/i, '');
	} else if (html.match(/<html[^>]*>/i)) {
		// Technically, <body> is optional.
		html = html
			.replace(/^[\s\S]*?<html[^>]*>\s*/i, '')
			.replace(/\s*<\/[\s]*html>[\s\S]*$/i, '');
	}
	return html;
};


PutStuffHerePrivate.prototype.readHTML = function(src, isMock) {
	var self = this;

	src = src.replace(/#.*$/, '');

	// WARNING:
	// Because of this, chains can only be added in synchronous methods.
	self.currentlyChaining = src || self.orgstuffhereNull;

	// If we already have the answer, then return immediately.
	if ((!src) || (self.html[src])) {
		return this;
	}

	// Otherwise, let's setup a queue.	
	var queue = new OrgStuffHereQueue();

	// It's possible that some other queue is already waiting for this HTML.
	if (typeof(self.queues[src]) === typeof(undefined)) {
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

	var handleHtml = function(someHtml) {
		if (self.shouldExtractBody) {
			someHtml = self.extractBody(someHtml);
		}
		self.html[src] = someHtml;
	};

	if (isMock) {
		setTimeout(function(){
			self.shouldExtractBody = false;
			handleHtml('<mock></mock>');
			finished();
		}, 1);
	} else if (typeof document !== typeof(undefined)) { 
		// In the browser
		if (window.location.protocol === 'file:') {
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
		} else {
			PutStuffHereAjax.getViaStandardHTTP(src, function(err, html){
				if (err) {
					println("ERROR: ");
					println(err);
					return;
				} else {
					handleHtml(html);
				}
				finished();
			});			
		}
	} else if (typeof fs !== typeof(undefined)) { 
		var path = require('path');
		// Or in Node.js, or any context capable of loading fs
		fs.readFile(path.resolve(self.templateRoot(), src), function(err, data){
			self.html[src] = '';
			if (err) {
				println("Warning: " + src);
				println(err);
			}
			if (Buffer.isBuffer(data)) { 
				var html = data.toString('utf8');
				handleHtml(html);
			}
			finished();
		});
	} else {
		println("Operating outside of Node or Browser context. Not sure where I am!");
	}
	return this;
};


if (typeof(module) === typeof(undefined)) window.module = {};
module.exports = PutStuffHerePrivate;