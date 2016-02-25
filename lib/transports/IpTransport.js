// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;
const buffers = require('h5.buffers');
const InvalidFrameError = require('../InvalidFrameError');
const ApplicationDataUnit = require('../ApplicationDataUnit');
const Transport = require('../Transport');

/**
 * @private
 * @const
 * @type {number}
 */
const IP_FRAME_MIN_LENGTH = 8;

class IpTransport extends Transport
{
  /**
   * @param {IpTransportOptions} [options]
   */
  constructor(options)
  {
    super();

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {number}
     */
    this.maxBufferLength = options.maxBufferLength || 1000;

    /**
     * @private
     * @type {Map<EventEmitter, IpTransportState>}
     * */
    this.eeToState = new Map();
  }

  destroy()
  {
    this.eeToState.forEach(state => state.destroy());
    this.eeToState = null;
  }

  /**
   * @param {?number} id
   * @param {number} unit
   * @param {Buffer} pdu
   * @returns {Buffer}
   */
  encode(id, unit, pdu)
  {
    const ipFrame = new Buffer(2 + 2 + 2 + 1 + pdu.length);

    ipFrame.writeUInt16BE(id, 0, true);
    ipFrame.writeUInt16BE(0, 2, true);
    ipFrame.writeUInt16BE(pdu.length + 1, 4, true);
    ipFrame.writeUInt8(unit, 6, true);
    pdu.copy(ipFrame, 7);

    return ipFrame;
  }

  /**
   * @param {Buffer} ipFrame
   * @returns {ApplicationDataUnit}
   * @throws {Error} If the specified buffer is not a valid MODBUS IP frame.
   */
  decode(ipFrame)
  {
    if (ipFrame.length < IP_FRAME_MIN_LENGTH)
    {
      throw new InvalidFrameError(
        `MODBUS IP frames must have at least ${IP_FRAME_MIN_LENGTH} bytes, `
        + `but got [${ipFrame.length}]: ${inspect(ipFrame)}`
      );
    }

    const state = new IpTransportState(null, this.maxBufferLength, null);

    state.pushData(ipFrame);
    state.readHeader();

    const error = state.validateHeader();

    if (error)
    {
      throw error;
    }

    return state.createAdu();
  }

  /**
   * @param {Buffer} ipFrame
   * @param {number} id Must be an unsigned 16-bit integer.
   * @returns {boolean}
   */
  update(ipFrame, id)
  {
    if (ipFrame.length >= 2)
    {
      ipFrame.writeUInt16BE(id & 0xFFFF, 0, true);

      return true;
    }

    return false;
  }

  /**
   * @param {EventEmitter} ee
   */
  add(ee)
  {
    if (this.eeToState.has(ee))
    {
      return;
    }

    const state = new IpTransportState(
      ee,
      this.maxBufferLength,
      () => this.eeToState.delete(ee)
    );

    this.eeToState.set(ee, state);
  }
}

/**
 * @private
 */
class IpTransportState
{
  /**
   * @param {?EventEmitter} ee
   * @param {number} maxBufferLength
   * @param {?function(): void} onDestroy
   */
  constructor(ee, maxBufferLength, onDestroy)
  {
    /**
     * @private
     * @type {?EventEmitter}
     */
    this.ee = ee;

    /**
     * @private
     * @type {number}
     */
    this.maxBufferLength = maxBufferLength;

    /**
     * @private
     * @type {?function(): void}
     */
    this.onDestroy = onDestroy;

    /**
     * @private
     * @type {function(this:IpTransportState)}
     */
    this.onClose = this.destroy.bind(this);

    /**
     * @private
     * @type {function(this:IpTransportState)}
     */
    this.onData = this.onData.bind(this);

    /**
     * @private
     * @type {number}
     */
    this.id = -1;

    /**
     * @private
     * @type {number}
     */
    this.version = -1;

    /**
     * @private
     * @type {number}
     */
    this.length = -1;

    /**
     * @private
     * @type {number}
     */
    this.unit = -1;

    /**
     * @private
     * @type {BufferQueueReader}
     */
    this.buffer = new buffers.BufferQueueReader();

    if (ee)
    {
      ee.on('close', this.onClose);
      ee.on('data', this.onData);
    }
  }

  destroy()
  {
    if (this.ee)
    {
      this.ee.removeListener('close', this.onClose);
      this.ee.removeListener('data', this.onData);
      this.ee = null;
    }

    if (this.buffer)
    {
      this.buffer.skip(this.buffer.length);
      this.buffer = null;
    }

    if (this.onDestroy)
    {
      this.onDestroy();
      this.onDestroy = null;
    }
  }

  /**
   * @param {Buffer} data
   */
  pushData(data)
  {
    this.buffer.push(data);
  }

  readHeader()
  {
    this.id = this.buffer.shiftUInt16(false);
    this.version = this.buffer.shiftUInt16(false);
    this.length = this.buffer.shiftUInt16(false) - 1;
    this.unit = this.buffer.shiftByte();
  }

  /**
   * @returns {?Error}
   */
  validateHeader()
  {
    if (this.version !== 0)
    {
      return new InvalidFrameError(
        'Invalid version specified in a header of a MODBUS IP frame. '
        + `Expected [0], but got [${this.version}].`
      );
    }

    if (this.length < 2)
    {
      return new InvalidFrameError(
        'Invalid length specified in a header of a MODBUS IP frame. '
        + `Expected at least [2], but got [${this.length}].`
      );
    }

    return null;
  }

  /**
   * @returns {ApplicationDataUnit}
   */
  createAdu()
  {
    return new ApplicationDataUnit(
      this.id,
      this.unit,
      this.buffer.shiftBuffer(this.length),
      null
    );
  }

  /**
   * @private
   */
  resetHeader()
  {
    this.id = -1;
    this.version = -1;
    this.length = -1;
    this.unit = -1;
  }

  /**
   * @private
   * @param {Buffer} data
   */
  onData(data)
  {
    this.pushData(data);
    this.handleIncompleteFrame();
  }

  /**
   * @private
   * @returns {boolean}
   */
  hasCompleteFrame()
  {
    return this.id !== -1 && this.buffer.length >= this.length;
  }

  /**
   * @private
   * @returns {boolean}
   */
  isReadable()
  {
    return this.id === -1 && this.buffer.length >= 7;
  }

  /**
   * @private
   */
  skipFrame()
  {
    if (this.length > 0)
    {
      this.buffer.skip(this.length);
    }
  }

  /**
   * @private
   */
  handleIncompleteFrame()
  {
    if (this.isReadable())
    {
      this.readHeader();
    }

    if (this.hasCompleteFrame())
    {
      this.handleCompleteFrame();

      return;
    }

    if (this.isBufferOverflow())
    {
      this.handleBufferOverflow();
    }
  }

  /**
   * @private
   */
  handleCompleteFrame()
  {
    const error = this.validateHeader();

    if (error)
    {
      this.skipFrame();
      this.resetHeader();

      this.ee.emit('error', error);

      return;
    }

    this.ee.emit('adu', this.createAdu());

    this.resetHeader();

    if (this.buffer.length > 0)
    {
      this.handleIncompleteFrame();
    }
  }

  /**
   * @private
   * @returns {boolean}
   */
  isBufferOverflow()
  {
    return this.buffer.length > this.maxBufferLength;
  }

  /**
   * @private
   */
  handleBufferOverflow()
  {
    this.resetHeader();

    this.ee.emit('bufferOverflow', this.buffer.shiftBuffer(this.buffer.length));
  }
}

module.exports = IpTransport;

/**
 * @typedef {Object} IpTransportOptions
 * @property {number} [maxBufferLength=1000]
 */
