/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Transport;

/**
 * @constructor
 * @extends {events.EventEmitter}
 * @param {Connection} connection
 */
function Transport(connection)
{
  EventEmitter.call(this);

  /**
   * @protected
   * @type {Connection}
   */
  this.connection = connection;
}

util.inherits(Transport, EventEmitter);

/**
 * @returns {Connection}
 */
Transport.prototype.getConnection = function()
{
  return this.connection;
};

Transport.prototype.destroy = function() {};

/**
 * @param {Transaction} transaction
 */
Transport.prototype.sendRequest = function(transaction) {};
