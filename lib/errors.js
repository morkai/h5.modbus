'use strict';

var inherits = require('util').inherits;

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.ResponseTimeoutError = createError(
  'ResponseTimeoutError',
  'No response was received from the slave in the specified time.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.InvalidChecksumError = createError(
  'InvalidChecksumError',
  'Response received from the slave had an invalid checksum.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.InvalidResponseDataError = createError(
  'InvalidResponseDataError',
  'Response data received from the slave was invalid.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.IncompleteResponseFrameError = createError(
  'IncompleteResponseFrameError',
  'Response frame received from the slave was incomplete.'
);

/**
 * @private
 * @param {string} name
 * @param {string} message
 * @returns {function(new:ModbusError)}
 */
function createError(name, message)
{
  /**
   * @constructor
   * @extends {Error}
   * @param {string} [newMessage]
   */
  function ModbusError(newMessage)
  {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = name;
    this.message = newMessage || message;
  }
  
  inherits(ModbusError, Error);
  
  return ModbusError;
}
