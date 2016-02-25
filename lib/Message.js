// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

/* eslint no-unused-vars: 0, valid-jsdoc: 0 */

'use strict';

/**
 * @abstract
 */
class Message
{
	/**
	 * @param {FunctionCode} functionCode
	 */
	constructor(functionCode)
	{
		/**
		 * @type {FunctionCode}
		 */
		this.functionCode = functionCode;
	}

	/**
	 * @abstract
	 * @param {Object} options
	 * @returns {Message}
	 * @throws {Error} If any of the specified `options` are invalid.
	 */
	static fromOptions(options)
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @param {Buffer} buffer
	 * @returns {Message}
	 * @throws {Error} If the specified `buffer` is not a valid binary representation of this message.
	 */
	static fromBuffer(buffer)
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @returns {Buffer}
	 */
	toBuffer()
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @returns {string}
	 */
	toString()
	{
		throw new Error('@abstract');
	}
}

module.exports = Message;
