/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Transport;

/**
 * @constructor
 * @extends {events.EventEmitter}
 */
function Transport()
{
  EventEmitter.call(this);
}

util.inherits(Transport, EventEmitter);

Transport.prototype.destroy = function() {};

/**
 * @param {Transaction} transaction
 */
Transport.prototype.sendRequest = function(transaction) {};
