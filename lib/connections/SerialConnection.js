'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = SerialConnection;

/**
 * Alias to the `open` event of the underlying `SerialPort`.
 *
 * @event SerialConnection#open
 */

/**
 * Alias to the `close` event of the underlying `SerialPort`.
 *
 * @event SerialConnection#close
 */

/**
 * Emitted when the underlying `SerialPort` emits the `error` event or its `write()` method throws.
 *
 * @event SerialConnection#error
 * @type {Error}
 */

/**
 * Emitted before writing any data to the underlying `SerialPort` (even if the serial port is closed).
 *
 * @event SerialConnection#write
 * @type {Buffer}
 */

/**
 * Alias to the `data` event of the underlying `SerialPort`.
 *
 * @event SerialConnection#data
 * @type {Buffer}
 */

/**
 * @constructor
 * @extends {Connection}
 * @param {SerialPort} serialPort
 * @fires SerialConnection#open
 * @fires SerialConnection#error
 */
function SerialConnection(serialPort)
{
  Connection.call(this);

  /**
   * @private
   * @type {SerialPort}
   */
  this.serialPort = this.setUpSerialPort(serialPort);
}

util.inherits(SerialConnection, Connection);

SerialConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.serialPort !== null)
  {
    this.serialPort.removeAllListeners();
    this.serialPort.close();
    this.serialPort = null;
  }
};

/**
 * Determines whether the underlying serial port is open.
 *
 * @returns {boolean}
 */
SerialConnection.prototype.isOpen = function()
{
  return this.serialPort !== null && this.serialPort.isOpen();
};

/**
 * Writes the specified data buffer to the underlying serial port.
 *
 * @param {Buffer} data
 * @fires SerialConnection#write
 * @fires SerialConnection#error
 */
SerialConnection.prototype.write = function(data)
{
  this.emit('write', data);

  if (this.serialPort === null)
  {
    return;
  }

  try
  {
    this.serialPort.write(data);
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @param {SerialPort} serialPort
 * @returns {SerialPort}
 */
SerialConnection.prototype.setUpSerialPort = function(serialPort)
{
  serialPort.on('open', this.emit.bind(this, 'open'));
  serialPort.on('close', this.emit.bind(this, 'close'));
  serialPort.on('error', this.emit.bind(this, 'error'));
  serialPort.on('data', this.emit.bind(this, 'data'));

  return serialPort;
};
