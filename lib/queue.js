"use strict";

/**
 * Queue
 * After http://www.dustindiaz.com/async-method-queues
 * @constructor
 */

var OrgStuffHereQueue = function() {
	// store your callbacks
	var _methods = [];

	// keep a reference to your response
	var _response = null;

	// all queues start off unflushed
	var _flushed = false;

	return {
		/**
		 * Adds callbacks to your queue
		 * @param {Function} fn The callback to add
		 */
		'add': function(fn) {
			var self = this;
			if (_flushed) {
				// if the queue has been flushed, return immediately
				fn(_response);
			} else {
				// otherwise push it on the queue
				_methods.push(fn);
			}
		},

		/**
		 * Adds callbacks to your queue
		 * @param {Function} fn The callback to add
		 */
		'flush': function(resp) {
			var self = this;
			// note: flush only ever happens once
			if (_flushed) {
				return;
			}

			// store your response for subsequent calls after flush()
			_response = resp;

			// mark that it's been flushed
			_flushed = true;

			// shift 'em out and call 'em back
			while (_methods[0]) {
				_methods.shift()(resp);
			}
		},
	};
};

if (typeof(module) === typeof(undefined)) window.module = {};
module.exports = OrgStuffHereQueue;
