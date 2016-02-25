// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Message = require('./Message');

/**
 * @abstract
 */
class Request extends Message
{
  /**
   * @param {FunctionCode} functionCode
   */
  constructor(functionCode)
  {
    super(functionCode);
  }
}

module.exports = Request;
