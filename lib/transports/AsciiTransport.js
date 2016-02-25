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
const ASCII_FRAME_MIN_LENGTH = 9;

/**
 * @private
 * @const
 * @type {number}
 */
const ASCII_FRAME_START = 0x3A;

/**
 * @private
 * @const
 * @type {number}
 */
const ASCII_FRAME_CR = 0x0D;

/**
 * @private
 * @const
 * @type {number}
 */
const ASCII_FRAME_LF = 0x0A;

class AsciiTransport extends Transport
{
	/**
	 * @param {AsciiTransportOptions} [options]
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
		 * @type {Map<EventEmitter, AsciiTransportState>}
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
		const asciiFrame = new Buffer(1 + 2 + pdu.length * 2 + 2 + 2);
		const checksum = lrc(unit, pdu);
		let i = 0;

		asciiFrame[i++] = ASCII_FRAME_START;
		asciiFrame[i++] = encodeNibble(high(unit));
		asciiFrame[i++] = encodeNibble(low(unit));

		for (let j = 0; j < pdu.length; ++j)
		{
			asciiFrame[i++] = encodeNibble(high(pdu[j]));
			asciiFrame[i++] = encodeNibble(low(pdu[j]));
		}

		asciiFrame[i++] = encodeNibble(high(checksum));
		asciiFrame[i++] = encodeNibble(low(checksum));
		asciiFrame[i++] = ASCII_FRAME_CR;
		asciiFrame[i] = ASCII_FRAME_LF;

		return asciiFrame;
	}

	/**
	 * @param {Buffer} asciiFrame
	 * @returns {ApplicationDataUnit}
	 * @throws {Error} If the specified buffer is not a valid MODBUS ASCII frame.
	 */
	decode(asciiFrame)
	{
		if (asciiFrame.length < ASCII_FRAME_MIN_LENGTH)
		{
			throw new InvalidFrameError(
				`MODBUS ASCII frames must have at least ${ASCII_FRAME_MIN_LENGTH} bytes, `
				+ `but got [${asciiFrame.length}]: ${inspect(asciiFrame)}`
			);
		}

		if (asciiFrame[0] !== ASCII_FRAME_START
			|| asciiFrame[asciiFrame.length - 2] !== ASCII_FRAME_CR
			|| asciiFrame[asciiFrame.length - 1] !== ASCII_FRAME_LF)
		{
			throw new InvalidFrameError(
				`MODBUS ASCII frames must begin with [:] and end with [CR] followed by [LF], but got: ${inspect(asciiFrame)}`
			);
		}

		const decodedFrame = decodeBytes(asciiFrame.slice(1, asciiFrame.length - 2));
		const expectedChecksum = decodedFrame.pop();
		const actualChecksum = lrc(0, decodedFrame);

		if (actualChecksum !== expectedChecksum)
		{
			throw new InvalidFrameError(`Checksum mismatch. Expected [${expectedChecksum}], but got [${actualChecksum}].`);
		}

		const unit = decodedFrame.shift();
		const pdu = new Buffer(decodedFrame);

		return new ApplicationDataUnit(null, unit, pdu, expectedChecksum);
	}

	/**
	 * @param {Buffer} asciiFrame
	 * @param {number} id
	 * @returns {boolean}
	 */
	update(asciiFrame, id) // eslint-disable-line no-unused-vars
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

		/** @type {AsciiTransportState} */
		const state = {
			buffer: new buffers.BufferQueueReader(),
			onClose: this.onClose.bind(this, ee),
			onTimeout: this.onTimeout.bind(this, ee),
			onData: this.onData.bind(this, ee),
			destroy: () =>
			{
				state.buffer.skip(state.buffer.length);
				state.buffer = null;

				ee.removeListener('close', state.onClose);
				ee.removeListener('onTimeout', state.onTimeout);
				ee.removeListener('data', state.onData);
				state.onClose = null;
				state.onTimeout = null;
				state.onData = null;

				this.eeToState.delete(ee);
			}
		};

		ee.on('close', state.onClose);
		ee.on('timeout', state.onTimeout);
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
	 * @param {number} requestId
	 */
	onTimeout(ee, requestId) // eslint-disable-line no-unused-vars
	{
		const state = this.eeToState.get(ee);

		if (state)
		{
			state.buffer.skip(state.buffer.length);
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

		const buffer = state.buffer;

		if (!this.isValidChunk(buffer, data))
		{
			ee.emit('error', new InvalidFrameError(
				`Invalid data chunk. Expected the first byte to be [:], but got: ${inspect(data)}`
			));

			return;
		}

		buffer.push(data);

		if (this.hasCompleteFrame(buffer))
		{
			this.handleCompleteFrame(ee, buffer);

			return;
		}

		if (this.isBufferOverflow(buffer))
		{
			this.handleBufferOverflow(ee, buffer);
		}
	}

	/**
	 * @private
	 * @param {BufferReader} buffer
	 * @param {Buffer} chunk
	 * @returns {boolean}
	 */
	isValidChunk(buffer, chunk)
	{
		return buffer.length > 0 || chunk[0] === ASCII_FRAME_START;
	}

	/**
	 * @private
	 * @param {BufferReader} buffer
	 * @returns {boolean}
	 */
	hasCompleteFrame(buffer)
	{
		return buffer.readByte(buffer.length - 2) === ASCII_FRAME_CR
			&& buffer.readByte(buffer.length - 1) === ASCII_FRAME_LF;
	}

	/**
	 * @private
	 * @param {EventEmitter} ee
	 * @param {BufferReader} buffer
	 */
	handleCompleteFrame(ee, buffer)
	{
		let adu = null;

		try
		{
			adu = this.decode(buffer.shiftBuffer(buffer.length));
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

	/**
	 * @private
	 * @param {Buffer} buffer
	 * @returns {boolean}
	 */
	isBufferOverflow(buffer)
	{
		return buffer.length > this.maxBufferLength;
	}

	/**
	 * @private
	 * @param {EventEmitter} ee
	 * @param {BufferReader} buffer
	 */
	handleBufferOverflow(ee, buffer)
	{
		ee.emit('bufferOverflow', buffer.shiftBuffer(buffer.length));
	}
}

/**
 * @private
 * @param {number} nibble
 * @returns {number}
 */
function encodeNibble(nibble)
{
	return nibble + (nibble < 10 ? 48 : 55);
}

/**
 * @private
 * @param {number} nibble
 * @returns {number}
 */
function decodeNibble(nibble)
{
	return nibble - (nibble < 65 ? 48 : 55);
}

/**
 * @private
 * @param {number} highNibble
 * @param {number} lowNibble
 * @returns {number}
 */
function decodeByte(highNibble, lowNibble)
{
	return (decodeNibble(highNibble) << 4) + (decodeNibble(lowNibble) << 0);
}

/**
 * @private
 * @param {(Buffer|number[])} bytes
 * @returns {number[]}
 */
function decodeBytes(bytes)
{
	const length = bytes.length / 2;
	const result = new Array(length);

	for (let resultI = 0, byteI = 0; resultI < length; ++resultI)
	{
		result[resultI] = decodeByte(bytes[byteI++], bytes[byteI++]);
	}

	return result;
}

/**
 * @private
 * @param {number} byte
 * @returns {number}
 */
function high(byte)
{
	return ((byte & 0xF0) >>> 4) & 0xFF;
}

/**
 * @private
 * @param {number} byte
 * @returns {number}
 */
function low(byte)
{
	return ((byte & 0x0F) >>> 0) & 0xFF;
}

/**
 * @private
 * @param {number} initial
 * @param {(Buffer|number[])} buffer
 * @returns {number}
 */
function lrc(initial, buffer)
{
	let result = initial & 0xFF;

	for (let i = 0; i < buffer.length; ++i)
	{
		result = (result + buffer[i]) & 0xFF;
	}

	return ((result ^ 0xFF) + 1) & 0xFF;
}

module.exports = AsciiTransport;

/**
 * @typedef {Object} AsciiTransportOptions
 * @property {number} [maxBufferLength=1000]
 */

/**
 * @typedef {Object} AsciiTransportState
 * @property {BufferQueueReader} buffer
 * @property {function(): void} onClose
 * @property {function(number): void} onTimeout
 * @property {function(Buffer): void} onData
 * @property {function(): void} destroy
 */
