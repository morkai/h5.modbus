/*jshint maxparams:5*/

'use strict';

var util = require('util');

/**
 * @type {function(string, ...[*]): string}
 */
exports.format = util.format;

/**
 * @type {function(function, function)}
 */
exports.inherits = util.inherits;

/**
 * @param {number} actualCode
 * @param {number} expectedCode
 * @throws {Error}
 */
exports.assertFunctionCode = function(actualCode, expectedCode)
{
  if (actualCode !== expectedCode)
  {
    throw new Error(util.format(
      "Expected function code to be '%d', got '%d'",
      expectedCode,
      actualCode
    ));
  }
};

/**
 * @param {Buffer} buffer
 * @param {number} minLength
 * @throws {Error}
 */
exports.assertBufferLength = function(buffer, minLength)
{
  if (buffer.length < minLength)
  {
    throw new Error(util.format(
      "The specified buffer must be at least '%d' bytes long.", minLength
    ));
  }
};

/**
 * @param {*} address
 * @returns {number}
 * @throws {Error}
 */
exports.prepareAddress = function(address)
{
  return prepareNumericOption(
    address, 0, 0, 65535, 'A starting address'
  );
};

/**
 * @param {*} quantity
 * @param {number} maxQuantity
 * @returns {number}
 * @throws {Error}
 */
exports.prepareQuantity = function(quantity, maxQuantity)
{
  return prepareNumericOption(
    quantity, 1, 1, maxQuantity, 'Quantity'
  );
};

/**
 * @param {*} registerValue
 * @returns {number}
 * @throws {Error}
 */
exports.prepareRegisterValue = function(registerValue)
{
  return prepareNumericOption(
    registerValue, 0, 0, 65535, 'Register value'
  );
};

/**
 * @private
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @param {string} label
 */
function prepareNumericOption(value, defaultValue, min, max, label)
{
  if (typeof value === 'undefined')
  {
    return defaultValue;
  }

  value = parseInt(value, 10);

  if (isNaN(value) || value < min || value > max)
  {
    throw new Error(util.format(
      "%s must be a number between %d and %d.",
      label,
      min,
      max
    ));
  }

  return value;
}
