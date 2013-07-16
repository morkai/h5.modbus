'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var functions = require('./functions');
var Transaction = require('./Transaction');

module.exports = Master;

/**
 * @private
 * @const
 * @type {function}
 */
var SUPPRESS_ERROR_FUNCTION = function() {};

/**
 * @constructor
 * @param {Master.Options|object} options
 * @event connected Emitted when the underlying `Connection` emits the `open`
 * event.
 * @event disconnected Emitted only when the underlying `Connection` emits the
 * first `close` event after the `open` event.
 * @event error Alias to the `error` event of the underlying `Connection`.
 */
function Master(options)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {Master.Options}
   */
  this.options = options instanceof Master.Options
    ? options
    : new Master.Options(options);

  /**
   * @private
   * @type {Transport}
   */
  this.transport = this.options.transport;

  /**
   * @private
   * @type {Connection}
   */
  this.connection = this.transport.getConnection();

  /**
   * @private
   * @type {number}
   */
  this.connectionCounter = 0;

  /**
   * @private
   * @type {Array.<Transaction>}
   */
  this.transactionQueue = [];

  /**
   * @private
   * @type {number}
   */
  this.executingRequests = 0;

  /**
   * @private
   * @type {Array.<Transaction>}
   */
  this.repeatableTransactions = [];

  this.setUpConnection();
}

util.inherits(Master, EventEmitter);

/**
 * @constructor
 * @param {object} options
 * @param {Transport} options.transport
 * @param {boolean} [options.suppressTransactionErrors]
 * @param {boolean} [options.retryOnException]
 * @param {number} [options.maxConcurrentRequests]
 * @param {number} [options.defaultUnit]
 * @param {number} [options.defaultMaxRetries]
 * @param {number} [options.defaultTimeout]
 */
Master.Options = function(options)
{
  /**
   * @type {Transport}
   */
  this.transport = options.transport;

  /**
   * @type {boolean}
   */
  this.suppressTransactionErrors =
    typeof options.suppressTransactionErrors === 'boolean'
      ? options.suppressTransactionErrors
      : false;

  /**
   * @type {boolean}
   */
  this.retryOnException = typeof options.retryOnException === 'boolean'
    ? options.retryOnException
    : true;

  /**
   * @type {number}
   */
  this.maxConcurrentRequests = typeof options.maxConcurrentRequests === 'number'
    ? options.maxConcurrentRequests
    : 1;

  /**
   * @type {number}
   */
  this.defaultUnit = typeof options.defaultUnit === 'number'
    ? options.defaultUnit
    : 0;

  /**
   * @type {number}
   */
  this.defaultMaxRetries = typeof options.defaultMaxRetries === 'number'
    ? options.defaultMaxRetries
    : 3;

  /**
   * @type {number}
   */
  this.defaultTimeout = typeof options.defaultTimeout === 'number'
    ? options.defaultTimeout
    : 100;
};

Master.prototype.destroy = function()
{
  this.options = null;

  if (this.transport !== null)
  {
    this.transport.destroy();
    this.transport = null;
  }

  this.connection = null;

  if (this.transactionQueue !== null)
  {
    this.transactionQueue.forEach(function(transaction)
    {
      transaction.destroy();
    });
    this.transactionQueue = null;
  }

  if (this.repeatableTransactions !== null)
  {
    this.repeatableTransactions.forEach(function(transaction)
    {
      transaction.destroy();
    });
    this.repeatableTransactions = null;
  }
};

/**
 * @returns {Transport}
 */
Master.prototype.getTransport = function()
{
  return this.transport;
};

/**
 * @returns {Connection}
 */
Master.prototype.getConnection = function()
{
  return this.connection;
};

/**
 * @returns {boolean}
 */
Master.prototype.isConnected = function()
{
  return this.connection.isOpen();
};

/**
 * @param {Transaction|object} options
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.execute = function(options)
{
  var transaction = this.createTransaction(options);

  if (transaction.isRepeatable())
  {
    this.addRepeatableTransaction(transaction);
  }

  this.transactionQueue.push(transaction);
  this.executeQueuedTransactions();

  return transaction;
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
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
Master.prototype.readCoils = function(address, quantity, options)
{
  return this.request(
    new functions.ReadCoilsRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
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
Master.prototype.readDiscreteInputs = function(address, quantity, options)
{
  return this.request(
    new functions.ReadDiscreteInputsRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
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
Master.prototype.readHoldingRegisters = function(address, quantity, options)
{
  return this.request(
    new functions.ReadHoldingRegistersRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
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
Master.prototype.readInputRegisters = function(address, quantity, options)
{
  return this.request(
    new functions.ReadInputRegistersRequest(address, quantity),
    options
  );
};

/**
 * @param {Array.<ReadFileSubRequest>} subRequests
 * @param {function|object} [options]
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
Master.prototype.readFileRecord = function(subRequests, options)
{
  return this.request(
    new functions.ReadFileRecordRequest(subRequests),
    options
  );
};

/**
 * @param {number} address
 * @param {boolean} state
 * @param {function|object} [options]
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
Master.prototype.writeSingleCoil = function(address, state, options)
{
  return this.request(
    new functions.WriteSingleCoilRequest(address, state),
    options
  );
};

/**
 * @param {number} address
 * @param {number} value
 * @param {function|object} [options]
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
Master.prototype.writeSingleRegister = function(address, value, options)
{
  return this.request(
    new functions.WriteSingleRegisterRequest(address, value),
    options
  );
};

/**
 * @param {number} address
 * @param {Array.<boolean>} states
 * @param {function|object} [options]
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
Master.prototype.writeMultipleCoils = function(address, states, options)
{
  return this.request(
    new functions.WriteMultipleCoilsRequest(address, states),
    options
  );
};

/**
 * @param {number} address
 * @param {Buffer} values
 * @param {function|object} [options]
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
Master.prototype.writeMultipleRegisters = function(address, values, options)
{
  return this.request(
    new functions.WriteMultipleRegistersRequest(address, values),
    options
  );
};

/**
 * @param {Array.<WriteFileSubRequest>} subRequests
 * @param {function|object} [options]
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
Master.prototype.writeFileRecord = function(subRequests, options)
{
  return this.request(
    new functions.WriteFileRecordRequest(subRequests),
    options
  );
};

/**
 * @private
 */
Master.prototype.setUpConnection = function()
{
  this.connection.on('error', this.emit.bind(this, 'error'));
  this.connection.on('open', this.onConnectionOpen.bind(this));
  this.connection.on('close', this.onConnectionClose.bind(this));
};

/**
 * @private
 */
Master.prototype.onConnectionOpen = function()
{
  this.connected = true;
  this.connectionCounter += 1;

  this.queueRepeatableTransactions();
  this.executeQueuedTransactions();

  this.emit('connected', this.connectionCounter);
};

/**
 * @private
 */
Master.prototype.onConnectionClose = function()
{
  if (this.connected)
  {
    this.emit('disconnected');

    this.connected = false;
  }
};

/**
 * @private
 * @param {ModbusFunction} request
 * @param {function|object} [options]
 * @returns {Transaction}
 */
Master.prototype.request = function(request, options)
{
  var optionsType = typeof options;

  if (optionsType === 'function')
  {
    options = {onComplete: options};
  }
  else if (optionsType !== 'object' || options === null)
  {
    options = {};
  }

  options.request = request;

  return this.execute(options);
};

/**
 * @private
 * @param {Transaction|object} options
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.createTransaction = function(options)
{
  var transaction;

  if (options instanceof Transaction)
  {
    transaction = options;
  }
  else
  {
    this.applyTransactionDefaults(options);

    transaction = Transaction.fromOptions(options);
  }

  if (this.options.suppressTransactionErrors)
  {
    transaction.on('error', SUPPRESS_ERROR_FUNCTION);
  }

  transaction.on(
    'complete',
    this.onTransactionComplete.bind(this, transaction)
  );

  return transaction;
};

/**
 * @private
 * @param {object} options
 */
Master.prototype.applyTransactionDefaults = function(options)
{
  if (typeof options.unit === 'undefined')
  {
    options.unit = this.options.defaultUnit;
  }

  if (typeof options.maxRetries === 'undefined')
  {
    options.maxRetries = this.options.defaultMaxRetries;
  }

  if (typeof options.timeout === 'undefined')
  {
    options.timeout = this.options.defaultTimeout;
  }
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.addRepeatableTransaction = function(transaction)
{
  var repeatableTransactions = this.repeatableTransactions;

  repeatableTransactions.push(transaction);

  transaction.once('cancel', function()
  {
    var transactionIndex = repeatableTransactions.indexOf(transaction);

    if (transactionIndex !== -1)
    {
      repeatableTransactions.splice(transactionIndex, 1);
    }
  });
};

/**
 * @private
 */
Master.prototype.queueRepeatableTransactions = function()
{
  for (var i = 0, l = this.repeatableTransactions.length; i < l; ++i)
  {
    this.transactionQueue.push(this.repeatableTransactions[i]);
  }
};

/**
 * @private
 */
Master.prototype.executeQueuedTransactions = function()
{
  while (this.transactionQueue.length > 0
    && this.executingRequests < this.options.maxConcurrentRequests)
  {
    var transaction = this.transactionQueue.shift();

    this.transport.sendRequest(transaction);

    this.executingRequests += 1;
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {Error} error
 * @param {Response} response
 */
Master.prototype.onTransactionComplete = function(transaction, error, response)
{
  this.executingRequests -= 1;

  if (!transaction.isCancelled())
  {
    if (error !== null)
    {
      this.handleError(transaction);
    }
    else if (response !== null)
    {
      this.handleResponse(transaction, response);
    }
  }

  this.executeQueuedTransactions();
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.handleError = function(transaction)
{
  if (transaction.shouldRetry())
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable() && this.isConnected())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {Response} response
 */
Master.prototype.handleResponse = function(transaction, response)
{
  if (response.isException()
    && transaction.shouldRetry()
    && this.options.retryOnException)
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable() && this.isConnected())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.scheduleExecution = function(transaction)
{
  var master = this;

  transaction.scheduleExecution(function()
  {
    if (!this.isCancelled())
    {
      master.transactionQueue.push(this);
      master.executeQueuedTransactions();
    }
  });
};
