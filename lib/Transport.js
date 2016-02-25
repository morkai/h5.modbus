// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

/* eslint no-unused-vars: 0, valid-jsdoc: 0 */

'use strict';

/**
 * @abstract
 */
class Transport
{
	constructor()
	{

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
	 * @param {?number} id
	 * @param {number} unit
	 * @param {Buffer} pdu
	 * @returns {Buffer}
	 */
	encode(id, unit, pdu)
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @param {Buffer} frame
	 * @returns {ApplicationDataUnit}
	 */
	decode(frame)
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @param {Buffer} frame
	 * @param {number} id
	 * @returns {boolean}
	 */
	update(frame, id)
	{
		throw new Error('@abstract');
	}

	/**
	 * @abstract
	 * @param {EventEmitter} ee
	 */
	add(ee)
	{
		throw new Error('@abstract');
	}
}


module.exports = Transport;
