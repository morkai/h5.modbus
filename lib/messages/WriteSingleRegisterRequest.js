// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The write single register request (code 0x06).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a register address (2 bytes),
 *   - a register value (2 bytes).
 */
class WriteSingleRegisterRequest extends Request
{
	/**
	 * @param {number} address An address of the register to write. Must be between 0 and 0xFFFF.
	 * @param {number} value A value of the register to write. Must be between 0 and 65535.
	 * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
	 * @throws {Error} If the specified `value` is not a number between 0 and 65535.
	 */
	constructor(address, value)
	{
		super(FunctionCode.WriteSingleRegister);

		/**
		 * An address of the register to write. A number between 0 and 0xFFFF.
		 *
		 * @readonly
		 * @type {number}
		 */
		this.address = helpers.prepareAddress(address, 1);

		/**
		 * A value of the register to write. A number between 0 and 65535.
		 *
		 * @readonly
		 * @type {number}
		 */
		this.value = helpers.prepareRegisterValue(value);
	}

	/**
	 * Creates a new request from the specified `options`.
	 *
	 * @param {Object} options
	 * @param {number} [options.address=0] An address of the register to write.
	 * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
	 * @param {number} [options.value=0] A value of the register to write.
	 * If specified, must be a number between 0 and 65535. Defaults to 0.
	 * @returns {WriteSingleRegisterRequest}
	 * @throws {Error} If any of the specified `options` are invalid.
	 */
	static fromOptions(options)
	{
		return new WriteSingleRegisterRequest(options.address, options.value);
	}

	/**
	 * Creates a new request from its binary representation.
	 *
	 * @param {Buffer} buffer A binary representation of this request.
	 * @returns {WriteSingleRegisterRequest}
	 * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
	 */
	static fromBuffer(buffer)
	{
		helpers.assertBufferLength(buffer, 5);
		helpers.assertFunctionCode(buffer[0], FunctionCode.WriteSingleRegister);

		return new WriteSingleRegisterRequest(
			buffer.readUInt16BE(1, true),
			buffer.readUInt16BE(3, true)
		);
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
		buffer.writeUInt16BE(this.address, 1, true);
		buffer.writeUInt16BE(this.value, 3, true);

		return buffer;
	}

	/**
	 * Returns a string representation of this request.
	 *
	 * @returns {string}
	 */
	toString()
	{
		return helpers.formatRequest(this, `Set register at address ${this.address} to: ${this.value}`);
	}
}

module.exports = WriteSingleRegisterRequest;
