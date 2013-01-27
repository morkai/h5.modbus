var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Transport;

/**
 * @name h5.modbus.Transport
 * @constructor
 * @extends {events.EventEmitter}
 */
function Transport()
{
  EventEmitter.call(this);
}

util.inherits(Transport, EventEmitter);

/**
 * @param {h5.modbus.Transaction} transaction
 */
Transport.prototype.sendRequest = function(transaction) {};
