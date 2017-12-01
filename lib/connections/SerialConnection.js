// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Connection = require('../Connection');

/** @type {?SerialPort} */
let SerialPort = null;

class SerialConnection extends Connection
{
  /**
   * @param {SerialConnectionOptions} options
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:SerialConnection)}
     */
    this.onOpen = this.onOpen.bind(this);

    /**
     * @private
     * @type {function(this:SerialConnection)}
     */
    this.onClose = this.onClose.bind(this);

    /**
     * @private
     * @type {function(this:SerialConnection, Error)}
     */
    this.onError = this.onError.bind(this);

    /**
     * @private
     * @type {function(this:SerialConnection)}
     */
    this.onReadable = this.onReadable.bind(this);

    /**
     * @private
     * @type {SerialPortOptions}
     */
    this.serialPortOptions = Object.assign(
      {path: process.platform === 'win32' ? 'COM1' : '/dev/ttys0'},
      options.serialPortOptions,
      {autoOpen: false}
    );

    /**
     * @private
     * @type {?SerialPort}
     */
    this.serialPort = this.setUpSerialPort(options.serialPort);

    /**
     * @private
     * @type {boolean}
     */
    this.closeOnDestroy = options.closeOnDestroy !== false;

    /**
     * @private
     * @type {boolean}
     */
    this.suppressErrorsAfterDestroy = options.suppressErrorsAfterDestroy !== false;

    if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    this.removeAllListeners();
    this.destroySerialPort();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    return this.serialPort !== null && this.serialPort.isOpen;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    return this.serialPort !== null && this.serialPort.opening;
  }

  open()
  {
    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    if (this.serialPort === null)
    {
      this.serialPort = this.setUpSocket(null);
    }

    this.serialPort.open();
  }

  close()
  {
    if (this.serialPort !== null)
    {
      this.serialPort.close();
    }
  }

  /**
   * @param {Buffer} data
   */
  write(data)
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
  }

  /**
   * @private
   * @param {SerialPort} serialPort
   * @returns {SerialPort}
   */
  setUpSerialPort(serialPort)
  {
    if (!serialPort)
    {
      if (SerialPort === null)
      {
        SerialPort = require('serialport');
      }

      serialPort = new SerialPort(this.serialPortOptions.path, this.serialPortOptions);
    }

    serialPort.on('open', this.onOpen);
    serialPort.on('close', this.onClose);
    serialPort.on('error', this.onError);
    serialPort.on('readable', this.onReadable);

    return serialPort;
  }

  /**
   * @private
   */
  destroySerialPort()
  {
    const serialPort = this.serialPort;

    if (serialPort === null)
    {
      return;
    }

    serialPort.removeListener('open', this.onOpen);
    serialPort.removeListener('close', this.onClose);
    serialPort.removeListener('error', this.onError);
    serialPort.removeListener('readable', this.onReadable);

    if (this.suppressErrorsAfterDestroy)
    {
      serialPort.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      serialPort.close();
    }

    this.serialPort = null;
  }

  /**
   * @private
   */
  onOpen()
  {
    this.emit('open');
  }

  /**
   * @private
   */
  onClose()
  {
    this.emit('close');
  }

  /**
   * @private
   * @param {Error} err
   */
  onError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   */
  onReadable()
  {
    if (!this.serialPort)
    {
      return;
    }

    const data = this.serialPort.read();

    if (data)
    {
      this.emit('data', data);
    }
  }
}

module.exports = SerialConnection;

/**
 * @typedef {Object} SerialConnectionOptions
 * @property {SerialPort} [serialPort]
 * @property {SerialPortOptions} [serialPortOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} SerialPortOptions
 * @property {number} [path] Defaults to `COM1` on win32 - `/dev/ttys0` otherwise.
 * @property {number} [baudRate=9600]
 * @property {number} [dataBits=8]
 * @property {number} [stopBits=1]
 * @property {string} [parity=none]
 * @property {boolean} [rtscts=false]
 * @property {boolean} [xon=false]
 * @property {boolean} [xoff=false]
 * @property {boolean} [xany=false]
 * @property {boolean} [hupcl=true]
 * @property {boolean} [rts=true]
 * @property {boolean} [cts=false]
 * @property {boolean} [dtr=true]
 * @property {boolean} [dts=false]
 * @property {boolean} [brk=false]
 * @property {number} [bufferSize=256]
 * @property {{vmin: number, vtime: number}} [platformOptions]
 */
