// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Listener = require('../Listener');
const RemoteClient = require('../RemoteClient');

/** @type {?SerialPort} */
let SerialPort = null;

class SerialListener extends Listener
{
  /**
   * @param {SerialListenerOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:SerialListener)}
     */
    this.onSerialOpen = this.onSerialOpen.bind(this);

    /**
     * @private
     * @type {function(this:SerialListener)}
     */
    this.onSerialClose = this.onSerialClose.bind(this);

    /**
     * @private
     * @type {function(this:SerialListener, Error)}
     */
    this.onSerialError = this.onSerialError.bind(this);

    /**
     * @private
     * @type {function(this:SerialListener)}
     */
    this.onSerialReadable = this.onSerialReadable.bind(this);

    if (!options)
    {
      options = {};
    }

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

    /**
     * @private
     * @type {?RemoteClient}
     */
    this.client = null;

    /**
     * @private
     * @type {?number}
     */
    this.setUpClientTimer = null;

    if (this.isOpen())
    {
      this.setUpClientTimer = setImmediate(this.setUpClient.bind(this));
    }
    else if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    if (this.setUpClientTimer !== null)
    {
      clearImmediate(this.setUpClientTimer);
      this.setUpClientTimer = null;
    }

    this.removeAllListeners();
    this.destroyClient();
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
      this.serialPort = this.setUpSerialPort(null);
    }

    this.serialPort.open();
  }

  close()
  {
    if (this.serialPort !== null)
    {
      this.destroyClient();
      this.serialPort.close();
    }
  }

  /**
   * @private
   * @param {SerialPort} [serialPort]
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

    serialPort.on('open', this.onSerialOpen);
    serialPort.on('close', this.onSerialClose);
    serialPort.on('error', this.onSerialError);
    serialPort.on('readable', this.onSerialReadable);

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

    serialPort.removeListener('open', this.onSerialOpen);
    serialPort.removeListener('close', this.onSerialClose);
    serialPort.removeListener('error', this.onSerialError);
    serialPort.removeListener('readable', this.onSerialReadable);

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
  onSerialOpen()
  {
    this.emit('open');
    this.setUpClient();
  }

  /**
   * @private
   */
  onSerialClose()
  {
    this.destroyClient();
    this.emit('close');
  }

  /**
   * @private
   * @param {Error} err
   */
  onSerialError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   */
  onSerialReadable()
  {
    if (!this.client || !this.serialPort)
    {
      return;
    }

    while (true) // eslint-disable-line no-constant-condition
    {
      const data = this.serialPort.read();

      if (data === null)
      {
        break;
      }

      this.client.emit('data', data);
    }
  }

  /**
   * @private
   */
  setUpClient()
  {
    if (this.setUpClientTimer !== null)
    {
      clearImmediate(this.setUpClientTimer);
      this.setUpClientTimer = null;
    }

    this.destroyClient();

    this.client = new RemoteClient({
      path: this.serialPort.path
    });

    this.client.on('close', this.onClientClose.bind(this));
    this.client.on('write', this.onClientWrite.bind(this));

    this.emit('client', this.client);
  }

  /**
   * @private
   */
  destroyClient()
  {
    if (this.client !== null)
    {
      this.client.destroy();
    }
  }

  /**
   * @private
   * @param {Buffer} data
   */
  onClientWrite(data)
  {
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
      this.client.emit('error', err);
    }
  }

  /**
   * @private
   */
  onClientClose()
  {
    this.client = null;
  }
}

module.exports = SerialListener;

/**
 * @typedef {Object} SerialListenerOptions
 * @property {SerialPort} [serialPort]
 * @property {SerialPortOptions} [serialPortOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} SerialRemoteClientInfo
 * @property {string} path
 */
