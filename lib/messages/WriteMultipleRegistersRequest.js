// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;
const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The write multiple registers request (code 0x10).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes),
 *   - a byte count (`n`; 1 byte),
 *   - new register data (`n` bytes).
 */
class WriteMultipleRegistersRequest extends Request
{
	/**
	 * @param {number} startingAddress A starting address of the registers to write. Must be between 0 and 0xFFFF.
	 * @param {Buffer} values Register values to write. Must have an even length of between 2 and 246 bytes.
	 * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
	 * @throws {Error} If the specified `values` is not an array of length between 1 and 1968.
	 * @throws {Error} If the sum of `startingAddress` and a half of `values.length` is not between 1 and 0x10000.
	 */
	constructor(startingAddress, values)
	{
		super(FunctionCode.WriteMultipleCoils);

		/**
		 * Register values to write. A Buffer of even length between 2 and 246 bytes.
		 *
		 * @readonly
		 * @type {Buffer}
		 */
		this.values = helpers.prepareRegisterValues(values);

		/**
		 * A starting address of the registers to write. A number between 0 and 0xFFFF.
		 *
		 * @readonly
		 * @type {number}
		 */
		this.startingAddress = helpers.prepareAddress(startingAddress, this.quantity);
	}

	/**
	 * Creates a new request from the specified `options`.
	 *
	 * @param {Object} options
	 * @param {number} [options.startingAddress=0] A starting address of the outputs to set.
	 * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
	 * @param {Buffer} options.values Register values to write.
	 * Must be a Buffer of even length between 2 and 246 bytes.
	 * @returns {WriteMultipleRegistersRequest}
	 * @throws {Error} If any of the specified `options` are invalid.
	 */
	static fromOptions(options)
	{
		return new WriteMultipleRegistersRequest(options.startingAddress, options.values);
	}

	/**
	 * Creates a new request from its binary representation.
	 *
	 * @param {Buffer} buffer A binary representation of this request.
	 * @returns {WriteMultipleRegistersRequest}
	 * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
	 */
	static fromBuffer(buffer)
	{
		helpers.assertBufferLength(buffer, 6 + (buffer[5] || 2));
		helpers.assertFunctionCode(buffer[0], FunctionCode.WriteMultipleRegisters);

		const startingAddress = buffer.readUInt16BE(1, true);
		const byteCount = buffer[5]; // 3 & 4 - quantity
		const values = buffer.slice(6, 6 + byteCount);

		return new WriteMultipleRegistersRequest(startingAddress, values);
	}

	/**
	 * An ending address. A number between 1 and 0x10000.
	 *
	 * @type {number}
	 */
	get endingAddress()
	{
		return this.startingAddress + this.quantity;
	}

	/**
	 * A quantity of registers to write. An even number between 1 to 123.
	 *
	 * @type {number}
	 */
	get quantity()
	{
		return this.values.length / 2;
	}

	/**
	 * Returns a binary representation of this request.
	 *
	 * @returns {Buffer}
	 */
	toBuffer()
	{
		var buffer = new Buffer(6 + this.values.length);

		buffer[0] = this.functionCode;
		buffer.writeUInt16BE(this.startingAddress, 1, true);
		buffer.writeUInt16BE(this.quantity, 3, true);
		buffer[5] = this.values.length;
		this.values.copy(buffer, 6);

		return buffer;
	}

	/**
	 * Returns a string representation of this request.
	 *
	 * @returns {string}
	 */
	toString()
	{
		if (this.quantity === 1)
		{
			return helpers.formatRequest(
				this, `Set register at address ${this.startingAddress} to ${this.values.readUInt16BE(0)}.`
			);
		}

		return helpers.formatRequest(
			this, `Set ${this.quantity} registers starting at address ${this.startingAddress} to: ${inspect(this.values)}`
		);
	}
}

module.exports = WriteMultipleRegistersRequest;
