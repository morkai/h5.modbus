// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The read input registers request (code 0x04).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes).
 */
class ReadInputRegistersRequest extends Request
{
	/**
	 * @param {number} startingAddress A starting address. Must be between 0 and 0xFFFF.
	 * @param {number} quantity A quantity of registers to read. Must be between 1 and 125.
	 * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
	 * @throws {Error} If the specified `quantity` is not a number between 1 and 125.
	 * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
	 */
	constructor(startingAddress, quantity)
	{
		super(FunctionCode.ReadInputRegisters);

		/**
		 * A quantity of registers to read. A number between 1 and 125.
		 *
		 * @type {number}
		 */
		this.quantity = helpers.prepareQuantity(quantity, 125);

		/**
		 * A starting address. A number between 0 and 0xFFFF.
		 *
		 * @type {number}
		 */
		this.startingAddress = helpers.prepareAddress(startingAddress, this.quantity);
	}

	/**
	 * Creates a new request from the specified `options`.
	 *
	 * @param {Object} options
	 * @param {number} [options.startingAddress=0] A starting address.
	 * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
	 * @param {number} [options.quantity=1] A quantity of coils.
	 * If specified, must be a number between 1 and 125. Defaults to 1.
	 * @returns {ReadInputRegistersRequest}
	 * @throws {Error} If any of the specified `options` are invalid.
	 */
	static fromOptions(options)
	{
		return new ReadInputRegistersRequest(options.startingAddress, options.quantity);
	}

	/**
	 * Creates a new request from its binary representation.
	 *
	 * @param {Buffer} buffer A binary representation of the request.
	 * @returns {ReadInputRegistersRequest}
	 * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
	 */
	static fromBuffer(buffer)
	{
		helpers.assertBufferLength(buffer, 5);
		helpers.assertFunctionCode(buffer[0], FunctionCode.ReadInputRegisters);

		return new ReadInputRegistersRequest(
			buffer.readUInt16BE(1, true),
			buffer.readUInt16BE(3, true)
		);
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
	 * A starting byte index.
	 *
	 * The starting index is an index of a first byte in a byte array that contains the requested registers.
	 * For example, given the following:
	 *
	 *   - byte array: `[0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]`,
	 *   - starting address: 2,
	 *   - and quantity of registers: 2
	 *
	 * the starting index is 4 (byte `0x44`), because our register data is at 4, 5, 6 and 7 (bytes `0x44556677`).
	 *
	 * @type {number}
	 */
	get startingIndex()
	{
		return this.startingAddress * 2;
	}

	/**
	 * An ending byte index.
	 *
	 * The ending index is an index of a byte in a byte array that follows the last byte containing
	 * the requested registers. For example, given the following:
	 *
	 *   - byte array: `[0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]`,
	 *   - starting address: 2,
	 *   - and quantity of registers: 2
	 *
	 * the ending index is 8 (byte `0x88`), because our register data is at 4, 5, 6 and 7 (bytes `0x44556677`).
	 *
	 * @type {number}
	 */
	get endingIndex()
	{
		return this.startIndex + this.quantity * 2;
	}

	/**
	 * Returns a binary representation of this request.
	 *
	 * @returns {Buffer}
	 */
	toBuffer()
	{
		const buffer = new Buffer(5);

		buffer[0] = this.functionCode;
		buffer.writeUInt16BE(this.startingAddress, 1, true);
		buffer.writeUInt16BE(this.quantity, 3, true);

		return buffer;
	}

	/**
	 * Returns a string representation of this request.
	 *
	 * @returns {string}
	 */
	toString()
	{
		return helpers.formatRequest(
			this,
			`Read ${this.quantity} input registers starting from address ${this.startingAddress}`
		);
	}
}

module.exports = ReadInputRegistersRequest;
