// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

class InvalidFrameError extends Error
{
	/**
	 * @param {string} [newMessage]
	 */
	constructor(newMessage)
	{
		super();
		Error.captureStackTrace(this, this.constructor);

		this.name = this.constructor.name;
		this.message = newMessage || 'Received an invalid MODBUS frame.';
	}
}

module.exports = InvalidFrameError;
