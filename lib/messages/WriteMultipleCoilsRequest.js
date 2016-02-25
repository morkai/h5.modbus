// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const buffers = require('h5.buffers');
const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The write multiple coils request (code 0x0F).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs (2 bytes),
 *   - a byte count (`n`; 1 byte),
 *   - states of the coils (`n` bytes).
 */
class WriteMultipleCoilsRequest extends Request
{
	/**
	 * @param {number} startingAddress A starting address of the outputs to set. Must be between 0 and 0xFFFF.
	 * @param {Array<boolean>} states States of the outputs to set. Must have between 1 and 1968 elements.
	 * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
	 * @throws {Error} If the specified `states` is not an array of length between 1 and 1968.
	 * @throws {Error} If the sum of `startingAddress` and `states.length` is not between 1 and 0x10000.
	 */
	constructor(startingAddress, states)
	{
		super(FunctionCode.WriteMultipleCoils);

		if (states.length < 1 || states.length > 1968)
		{
			throw new Error(`Invalid coil states. Expected an array with 1 to 1968 elements, but got [${states.length}].`);
		}

		/**
		 * A starting address of the outputs to set. A number between 0 and 0xFFFF.
		 *
		 * @readonly
		 * @type {number}
		 */
		this.startingAddress = helpers.prepareAddress(startingAddress, states.length);

		/**
		 * States of the outputs to set. An array of between 1 and 1968 truthy or falsy values.
		 *
		 * @readonly
		 * @type {Array<boolean>}
		 */
		this.states = states;
	}

	/**
	 * Creates a new request from the specified `options`.
	 *
	 * @param {Object} options
	 * @param {number} [options.startingAddress=0] A starting address of the outputs to set.
	 * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
	 * @param {Array<boolean>} options.states States of the outputs to set.
	 * Must be an array of 1 to 1968 truthy or falsy values.
	 * @returns {WriteMultipleCoilsRequest}
	 * @throws {Error} If any of the specified `options` are invalid.
	 */
	static fromOptions(options)
	{
		return new WriteMultipleCoilsRequest(options.startingAddress, options.states);
	}

	/**
	 * Creates a new request from its binary representation.
	 *
	 * @param {Buffer} buffer A binary representation of this request.
	 * @returns {WriteMultipleCoilsRequest}
	 * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
	 */
	static fromBuffer(buffer)
	{
		const reader = new buffers.BufferReader(buffer);

		helpers.assertFunctionCode(reader.shiftByte(), FunctionCode.WriteMultipleCoils);

		const startingAddress = reader.shiftUInt16();
		const quantity = reader.shiftUInt16();

		// Number of bytes
		reader.skip(1);

		const states = reader.shiftBits(quantity);

		return new WriteMultipleCoilsRequest(startingAddress, states);
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
	 * A quantity of outputs to set. A number between 1 to 1968.
	 *
	 * @type {number}
	 */
	get quantity()
	{
		return this.states.length;
	}

	/**
	 * Returns a binary representation of this request.
	 *
	 * @returns {Buffer}
	 */
	toBuffer()
	{
		return new buffers.BufferBuilder()
			.pushByte(0x0F)
			.pushUInt16(this.startingAddress)
			.pushUInt16(this.states.length)
			.pushByte(Math.ceil(this.states.length / 8))
			.pushBits(this.states)
			.toBuffer();
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
				this, `Set coil at address ${this.startingAddress} to ${this.states[0] ? 'ON' : 'OFF'}.`
			);
		}

		const states = this.states.map(s => s ? '1' : '0').join(', ');

		return helpers.formatRequest(
			this, `Set ${this.quantity} coils starting at address ${this.startingAddress} to: ${states}`
		);
	}
}

module.exports = WriteMultipleCoilsRequest;
