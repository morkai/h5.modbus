/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;

/**
 * @name h5.modbus.Connection
 * @constructor
 * @extends {events.EventEmitter}
 * @event error
 * @event data
 */
function Connection()
{
  EventEmitter.call(this);
}

util.inherits(Connection, EventEmitter);

Connection.prototype.destroy = function() {};

/**
 * @param {Buffer} data
 */
Connection.prototype.write = function(data) {};
