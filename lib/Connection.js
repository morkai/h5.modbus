// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

/* eslint-disable no-unused-vars, valid-jsdoc */

'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * @abstract
 */
class Connection extends EventEmitter
{
	constructor()
	{
		super();
	}

	/**
	 * @abstract
	 */
	destroy()
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @returns {boolean}
	 */
	isOpen()
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @param {Buffer} data
	 */
	write(data)
	{
		throw new Error('@abstract');
	}
}

module.exports = Connection;
