/**
 * Queue
 * After http://www.dustindiaz.com/async-method-queues
 * @constructor
 */


var Queue = function() {
	// store your callbacks
	this._methods = [];

	// keep a reference to your response
	this._response = null;

	// all queues start off unflushed
	this._flushed = false;
};

/**
 * Adds callbacks to your queue
 * @param {Function} fn The callback to add
 */
Queue.prototype.add = function(fn) {
	var self = this;
	if (this._flushed) {
		// if the queue has been flushed, return immediately
		fn(this._response);
	} else {
		// otherwise push it on the queue
		this._methods.push(fn);
	}
};

/**
 * Adds callbacks to your queue
 * @param {Function} fn The callback to add
 */
Queue.prototype.flush = function(resp) {
	var self = this;
	// note: flush only ever happens once
	if (this._flushed) {
		return;
	}

	// store your response for subsequent calls after flush()
	this._response = resp;

	// mark that it's been flushed
	this._flushed = true;

	// shift 'em out and call 'em back
	while (this._methods[0]) {
		this._methods.shift()(resp);
	}
};

var module = module || {};
module.exports = module.exports || {};

module.exports = {
	Queue: Queue
};