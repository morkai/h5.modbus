// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const EventEmitter = require('events').EventEmitter;
const Request = require('./Request');
const requests = require('./messages').requests;

/**
 * @private
 * @type {number}
 */
let TID = 0;

class Transaction extends EventEmitter
{
  /**
   * @param {TransactionOptions} options
   */
  constructor(options)
  {
    super();

    /**
     * @readonly
     * @type {string}
     */
    this.id = typeof options.id === 'string' ? options.id : `T~${++TID}`;

    /**
     * @readonly
     * @type {number}
     */
    this.unit = options.unit >= 0 ? options.unit : 1;

    /**
     * @readonly
     * @type {number}
     */
    this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 1;

    /**
     * @readonly
     * @type {number}
     */
    this.timeout = options.timeout > 0 ? options.timeout : 100;

    /**
     * @readonly
     * @type {number}
     */
    this.interval = options.interval >= 0 ? options.interval : -1;

    /**
     * @readonly
     * @type {Request}
     */
    this.request = typeof options.request.toBuffer === 'function'
      ? options.request
      : requests[options.request.functionCode].fromOptions(options.request);

    /**
     * @private
     * @type {?function(): void}
     */
    this.onDestroy = null;
  }

  destroy()
  {
    this.removeAllListeners();

    if (this.onDestroy)
    {
      this.onDestroy();
      this.onDestroy = null;
    }
  }

  /**
   * @returns {boolean}
   */
  isRepeatable()
  {
    return this.interval >= 0;
  }

  /**
   * @param {function(): void} onDestroy
   * @throws {Error} If this `Transaction` is already bound to another `Master`.
   */
  bind(onDestroy)
  {
    if (this.onDestroy)
    {
      throw new Error(`Transaction [${this.id}] is already bound to another Master.`);
    }

    this.onDestroy = onDestroy;
  }
}

module.exports = Transaction;

/**
 * @typedef {Object} TransactionOptions
 * @property {?string} [id]
 * @property {number} [unit=1]
 * @property {number} [maxRetries=1]
 * @property {number} [timeout=100]
 * @property {number} [interval=-1]
 * @property {(Request|{functionCode: FunctionCode})} [request]
 */
