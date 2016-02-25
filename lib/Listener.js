// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

/* eslint no-unused-vars: 0, valid-jsdoc: 0 */

'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * @abstract
 */
class Listener extends EventEmitter
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
}

module.exports = Listener;
