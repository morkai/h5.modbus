/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;

/**
 * @constructor
 * @extends {events.EventEmitter}
 */
function Connection()
{
  EventEmitter.call(this);
}

util.inherits(Connection, EventEmitter);

Connection.prototype.destroy = function() {};

/**
 * @returns {boolean}
 */
Connection.prototype.isOpen = function() {};

/**
 * @param {Buffer} data
 */
Connection.prototype.write = function(data) {};
