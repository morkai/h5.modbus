'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Request = require('./functions/Request');
var ResponseTimeoutError = require('./errors').ResponseTimeoutError;

module.exports = Transaction;

/**
 * @typedef {object} Transaction~Options
 * @property {(Request|Request~Options)} request The MODBUS function to execute.
 * @property {number} [unit] The unit of the slave device.
 * Defaults to `[defaultUnit]{@link Master.Options#defaultUnit}`.
 * @property {number} [interval] The number of milliseconds after the request completion, after which the transaction
 * is to be executed again. `-1` marks the transaction as non-repeatable. Defaults to `-1`.
 * @property {number} [timeout] The number of milliseconds the transport must wait for the response before emitting
 * the `timeout` event. Defaults to `[defaultTimeout]{@link Master.Options#defaultTimeout}`.
 * @property {number} [maxRetries] The number of times the master must retry a failed transaction, before an error
 * is returned. Defaults to `[defaultMaxRetries]{@link Master.Options#defaultMaxRetries}`.
 * @property {function} [onResponse] onResponse
 * @property {function} [onError]    onError
 * @property {function} [onComplete] onComplete
 */

/*
 * @event Transaction#error
 * @event Transaction#response
 * @event Transaction#complete
 * @event Transaction#timeout
 * @event Transaction#cancel
 */

/**
 * @constructor
 * @extends {external:EventEmitter}
 * @param {Request} request
 */
function Transaction(request)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {Request}
   */
  this.request = request;

  /**
   * @private
   * @type {number}
   */
  this.unit = 0;

  /**
   * @private
   * @type {number}
   */
  this.maxRetries = 0;

  /**
   * @private
   * @type {number}
   */
  this.timeout = 0;

  /**
   * @private
   * @type {number}
   */
  this.interval = -1;

  /**
   * @private
   * @type {boolean}
   */
  this.cancelled = false;

  /**
   * @private
   * @type {Buffer|null}
   */
  this.adu = null;

  /**
   * @private
   * @type {number}
   */
  this.failures = 0;

  /**
   * @private
   * @type {number|null}
   */
  this.timeoutTimer = null;

  /**
   * @private
   * @type {number|null}
   */
  this.executionTimer = null;
}

util.inherits(Transaction, EventEmitter);

/**
 * @param {Transaction|object} options
 * @param {Request|object} options.request
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.fromOptions = function(options)
{
  if (options instanceof Transaction)
  {
    return options;
  }

  var request = options.request instanceof Request
    ? options.request
    : Request.fromOptions(options.request);

  var transaction = new Transaction(request);

  if (typeof options.unit !== 'undefined')
  {
    transaction.setUnit(options.unit);
  }

  if (typeof options.maxRetries !== 'undefined')
  {
    transaction.setMaxRetries(options.maxRetries);
  }

  if (typeof options.timeout !== 'undefined')
  {
    transaction.setTimeout(options.timeout);
  }

  if (typeof options.interval !== 'undefined')
  {
    transaction.setInterval(options.interval);
  }

  if (typeof options.onResponse === 'function')
  {
    transaction.on('response', options.onResponse);
  }

  if (typeof options.onError === 'function')
  {
    transaction.on('error', options.onError);
  }

  if (typeof options.onComplete === 'function')
  {
    transaction.on('complete', options.onComplete);
  }

  return transaction;
};

Transaction.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.timeoutTimer !== null)
  {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
  }

  if (this.executionTimer !== null)
  {
    clearTimeout(this.executionTimer);
    this.executionTimer = null;
  }
};

/**
 * @returns {Request}
 */
Transaction.prototype.getRequest = function()
{
  return this.request;
};

/**
 * @returns {number}
 */
Transaction.prototype.getUnit = function()
{
  return this.unit;
};

/**
 * @param {number} unit
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setUnit = function(unit)
{
  if (typeof unit !== 'number' || unit < 0 || unit > 255)
  {
    throw new Error(util.format(
      "Invalid unit value. Expected a number between 0 and 255, got: %s",
      unit
    ));
  }

  this.unit = unit;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getMaxRetries = function()
{
  return this.maxRetries;
};

/**
 * @param {number} maxRetries
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setMaxRetries = function(maxRetries)
{
  if (typeof maxRetries !== 'number' || maxRetries < 0)
  {
    throw new Error(util.format(
      "Invalid max retries value. Expected a number greater than or equal to 0, got: %s",
      maxRetries
    ));
  }

  this.maxRetries = maxRetries;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getTimeout = function()
{
  return this.timeout;
};

/**
 * @param {number} timeout
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setTimeout = function(timeout)
{
  if (typeof timeout !== 'number' || timeout < 1)
  {
    throw new Error(util.format(
      "Invalid timeout value. Expected a number greater than 0, got: %s",
      timeout
    ));
  }

  this.timeout = timeout;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getInterval = function()
{
  return this.interval;
};

/**
 * @param {number} interval
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setInterval = function(interval)
{
  if (typeof interval !== 'number' || interval < -1)
  {
    throw new Error(util.format(
      "Invalid interval value. Expected a number greater than or equal to -1, got: %s",
      interval
    ));
  }

  this.interval = interval;

  return this;
};

/**
 * @returns {boolean}
 */
Transaction.prototype.isRepeatable = function()
{
  return this.interval !== -1;
};

/**
 * @param {Response} response
 */
Transaction.prototype.handleResponse = function(response)
{
  this.stopTimeout();

  if (response.isException())
  {
    this.failures += 1;
  }
  else
  {
    this.failures = 0;
  }

  var transaction = this;

  process.nextTick(function()
  {
    if (!transaction.isCancelled())
    {
      transaction.emit('response', response);
    }

    transaction.emit('complete', null, response);
  });
};

/**
 * @param {Error} error
 */
Transaction.prototype.handleError = function(error)
{
  this.stopTimeout();

  this.failures += 1;

  var transaction = this;

  process.nextTick(function()
  {
    if (!transaction.isCancelled())
    {
      transaction.emit('error', error);
    }

    transaction.emit('complete', error, null);
  });
};

/**
 * @param {function} onTimeout
 */
Transaction.prototype.start = function(onTimeout)
{
  this.timeoutTimer = setTimeout(
    this.handleTimeout.bind(this, onTimeout),
    this.timeout
  );
};

/**
 * @param {function} cb
 */
Transaction.prototype.scheduleExecution = function(cb)
{
  if (this.interval === 0)
  {
    cb.call(this);
  }
  else if (this.interval > 0)
  {
    this.executionTimer = setTimeout(cb.bind(this), this.interval);
  }
};

/**
 * @returns {boolean}
 */
Transaction.prototype.shouldRetry = function()
{
  return this.failures <= this.maxRetries;
};

Transaction.prototype.cancel = function()
{
  if (this.cancelled)
  {
    return;
  }

  this.cancelled = true;

  this.emit('cancel');
};

/**
 * @returns {boolean}
 */
Transaction.prototype.isCancelled = function()
{
  return this.cancelled;
};

/**
 * @returns {Buffer|null}
 */
Transaction.prototype.getAdu = function()
{
  return this.adu;
};

/**
 * @param {Buffer} adu
 * @throws {Error} If the ADU was already set.
 */
Transaction.prototype.setAdu = function(adu)
{
  if (this.adu !== null)
  {
    throw new Error("ADU for this transaction was already set.");
  }

  this.adu = adu;
};

/**
 * @private
 */
Transaction.prototype.stopTimeout = function()
{
  if (this.timeoutTimer !== null)
  {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
  }
};

/**
 * @private
 * @param {function} cb
 */
Transaction.prototype.handleTimeout = function(cb)
{
  this.timeoutTimer = null;

  cb();

  if (!this.isCancelled())
  {
    this.emit('timeout');
  }

  this.handleError(new ResponseTimeoutError());
};
