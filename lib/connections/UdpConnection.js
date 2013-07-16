'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = UdpConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {UdpConnection.Options|object} options
 * @event open Alias to the `listening` event of the underlying `dgram.Socket`.
 * @event close Alias to the `close` event of the underlying `dgram.Socket`.
 * @event error Emitted when the underlying `dgram.Socket` emits the `error`
 * event or its `send()` method throws.
 * @event data Alias to the `message` event of the underlying `dgram.Socket`.
 */
function UdpConnection(options)
{
  Connection.call(this);

  /**
   * @readonly
   * @type {UdpConnection.Options}
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
    this.socket.removeAllListeners();
    this.socket.close();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `dgram.Socket` is bound,
 * i.e. the `bind()` method was called and the `listening` event was emitted.
 */
UdpConnection.prototype.isOpen = function()
{
  try
  {
    this.socket.address();

    return true;
  }
  catch (err)
  {
    return false;
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

  socket.on('listening', this.emit.bind(this, 'open'));
  socket.on('close', this.emit.bind(this, 'close'));
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('message', this.emit.bind(this, 'data'));

  return socket;
};
