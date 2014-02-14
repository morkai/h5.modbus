'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = SerialConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {serialport.SerialPort} serialPort
 * @event open Alias to the `open` event of the underlying `SerialPort`.
 * @event close Alias to the `close` event of the underlying `SerialPort`.
 * @event error Emitted when the underlying `SerialPort` emits the `error`
 * event or its `write()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `SerialPort` (even if the serial port is closed).
 * @event data Alias to the `data` event of the underlying `SerialPort`.
 */
function SerialConnection(serialPort)
{
  Connection.call(this);

  /**
   * @private
   * @type {serialport.SerialPort}
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
 * @returns {boolean}
 */
SerialConnection.prototype.isOpen = function()
{
  // That's how SerialPort.write() checks whether the port is open.
  // There's no dedicated public method.
  return !!this.serialPort.fd;
};

/**
 * @param {Buffer} data
 */
SerialConnection.prototype.write = function(data)
{
  this.emit('write', data);

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
 * @param {serialport.SerialPort} serialPort
 * @returns {serialport.SerialPort}
 */
SerialConnection.prototype.setUpSerialPort = function(serialPort)
{
  serialPort.on('open', this.emit.bind(this, 'open'));
  serialPort.on('close', this.emit.bind(this, 'close'));
  serialPort.on('error', this.emit.bind(this, 'error'));
  serialPort.on('data', this.emit.bind(this, 'data'));

  return serialPort;
};
