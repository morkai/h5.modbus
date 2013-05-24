'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = UdpConnection;

/**
 * @name h5.modbus.connections.UdpConnection
 * @constructor
 * @extends {h5.modbus.Connection}
 * @param {h5.modbus.connections.UdpConnection.Options|object} options
 * @event error
 * @event data
 */
function UdpConnection(options)
{
  Connection.call(this);

  /**
   * @readonly
   * @type {h5.modbus.connections.UdpConnection.Options}
   */
  this.options = options instanceof UdpConnection.Options
    ? options
    : new UdpConnection.Options(options);

  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket();
}

util.inherits(UdpConnection, Connection);

/**
 * @name h5.modbus.connections.UdpConnection.Options
 * @constructor
 * @param {object} options
 * @param {dgram.Socket} options.socket
 * @param {string} [options.host]
 * @param {number} [options.port]
 */
UdpConnection.Options = function(options)
{
  /**
   * @type {dgram.Socket}
   */
  this.socket = options.socket;

  /**
   * @type {string}
   */
  this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  this.port = typeof options.port === 'number' ? options.port : 502;
};

UdpConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.close();
    this.socket = null;
  }
};

/**
 * @param {Buffer} data
 */
UdpConnection.prototype.write = function(data)
{
  try
  {
    this.socket.send(
      data, 0, data.length, this.options.port, this.options.host
    );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @returns {dgram.Socket}
 */
UdpConnection.prototype.setUpSocket = function()
{
  var socket = this.options.socket;

  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('message', this.emit.bind(this, 'data'));

  return socket;
};
