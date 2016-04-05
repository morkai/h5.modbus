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
const RTU_FRAME_MIN_LENGTH = 5;

/**
 * @private
 * @const
 * @type {Array<number>}
 */
const CRC_TABLE = [
  0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
  0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
  0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
  0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
  0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
  0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
  0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
  0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
  0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
  0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
  0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
  0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
  0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
  0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
  0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
  0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
  0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
  0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
  0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
  0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
  0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
  0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
  0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
  0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
  0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
  0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
  0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
  0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
  0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
  0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
  0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
  0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040
];

class RtuTransport extends Transport
{
  /**
   * @param {RtuTransportOptions} [options]
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
     * @type {function(this:RtuTransport, EventEmitter)}
     */
    this.handleEndOfFrame = this.handleEndOfFrame.bind(this);

    /**
     * @private
     * @type {number}
     */
    this.eofTimeout = options.eofTimeout > 0 ? options.eofTimeout : 0;

    /**
     * @private
     * @type {Map<EventEmitter, RtuTransportState>}
     */
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
    const rtuFrame = new Buffer(1 + pdu.length + 2);
    const checksum = crc16(unit, pdu);

    rtuFrame[0] = unit;
    pdu.copy(rtuFrame, 1);
    rtuFrame.writeUInt16LE(checksum, 1 + pdu.length, true);

    return rtuFrame;
  }

  /**
   * @param {Buffer} rtuFrame
   * @returns {ApplicationDataUnit}
   * @throws {Error} If the specified buffer is not a valid MODBUS ASCII frame.
   */
  decode(rtuFrame)
  {
    if (rtuFrame.length < RTU_FRAME_MIN_LENGTH)
    {
      throw new InvalidFrameError(
        `MODBUS RTU frames must have at least ${RTU_FRAME_MIN_LENGTH} bytes, `
        + `but got [${rtuFrame.length}]: ${inspect(rtuFrame)}`
      );
    }

    const unit = rtuFrame[0];
    const pdu = rtuFrame.slice(1, rtuFrame.length - 2);
    const expectedChecksum = rtuFrame.readUInt16LE(rtuFrame.length - 2, true);
    const actualChecksum = crc16(unit, pdu);

    if (actualChecksum !== expectedChecksum)
    {
      throw new InvalidFrameError(`Checksum mismatch. Expected [${expectedChecksum}], but got [${actualChecksum}].`);
    }

    return new ApplicationDataUnit(null, unit, pdu, expectedChecksum);
  }

  /**
   * @param {Buffer} rtuFrame
   * @param {number} id
   * @returns {boolean}
   */
  update(rtuFrame, id) // eslint-disable-line no-unused-vars
  {
    return true;
  }

  /**
   * @abstract
   * @param {EventEmitter} ee
   */
  add(ee)
  {
    if (this.eeToState.has(ee))
    {
      return;
    }

    /** @type {RtuTransportState} */
    const state = {
      buffer: new buffers.BufferQueueReader(),
      eofTimer: null,
      onClose: this.onClose.bind(this, ee),
      onData: this.onData.bind(this, ee),
      destroy: () =>
      {
        state.buffer.skip(state.buffer.length);
        state.buffer = null;

        if (state.eofTimer)
        {
          clearTimeout(state.eofTimer);
          state.eofTimer = null;
        }

        ee.removeListener('close', state.onClose);
        ee.removeListener('data', state.onData);
        state.onClose = null;
        state.onData = null;

        this.eeToState.delete(ee);
      }
    };

    ee.on('close', state.onClose);
    ee.on('data', state.onData);

    this.eeToState.set(ee, state);
  }

  /**
   * @private
   * @param {EventEmitter} ee
   */
  onClose(ee)
  {
    const state = this.eeToState.get(ee);

    if (state)
    {
      state.destroy();
    }
  }

  /**
   * @private
   * @param {EventEmitter} ee
   * @param {Buffer} data
   */
  onData(ee, data)
  {
    const state = this.eeToState.get(ee);

    if (!state)
    {
      return;
    }

    state.buffer.push(data);

    if (this.eofTimeout <= 0)
    {
      this.handleEndOfFrame(ee);

      return;
    }

    clearTimeout(state.eofTimer);

    state.eofTimer = setTimeout(this.handleEndOfFrame, this.eofTimeout, ee);
  }

  /**
   * @private
   * @param {EventEmitter} ee
   */
  handleEndOfFrame(ee)
  {
    const state = this.eeToState.get(ee);

    if (!state)
    {
      return;
    }

    state.eofTimer = null;

    let adu = null;

    try
    {
      adu = this.decode(state.buffer.shiftBuffer(state.buffer.length));
    }
    catch (err)
    {
      ee.emit('error', err);
    }

    if (adu !== null)
    {
      ee.emit('adu', adu);
    }
  }
}

module.exports = RtuTransport;

/**
 * @private
 * @param {number} firstByte
 * @param {Buffer} buffer
 * @returns {number}
 */
function crc16(firstByte, buffer)
{
  let crc = 0xFFFF;
  let j;

  if (firstByte !== -1)
  {
    j = (crc ^ firstByte) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  for (let i = 0, l = buffer.length; i < l; ++i)
  {
    j = (crc ^ buffer[i]) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  return crc;
}

/**
 * @typedef {Object} RtuTransportOptions
 * @property {number} [eofTimeout=10] End of frame timeout.
 */

/**
 * @typedef {Object} RtuTransportState
 * @property {BufferQueueReader} buffer
 * @property {?number} eofTimer
 * @property {function(): void} onClose
 * @property {function(Buffer): void} onData
 * @property {function(): void} destroy
 */
