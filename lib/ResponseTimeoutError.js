// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

class ResponseTimeoutError extends Error
{
  /**
   * @param {string} [newMessage]
   */
  constructor(newMessage)
  {
    super();
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.message = newMessage || 'No response was received from the slave in the specified time.';
  }
}

module.exports = ResponseTimeoutError;
