'use strict';

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var functions = require('./functions');
var Transaction = require('./Transaction');

module.exports = Master;

/**
 * @private
 * @const
 * @type {function}
 */
var ERROR_SUPPRESSION_FUNCTION = function() {};

/**
 * Alias to the [`open`]{@link Connection#event:open} event of the underlying [`Connection`]{@link Connection}.
 *
 * @event Master#connected
 */

/**
 * Emitted whenever the previously opened connection to the slave ends.
 *
 * This event differs from the [`Connection's`]{@link Connection} [`close`]{@link Connection#event:close} event
 * in that the `disconnected` event is emitted only after the connection was established and then closed,
 * and the `close` event is emitted even after each failed connection attempt.
 *
 * @event Master#disconnected
 */

/**
 * Alias to the [`error`]{@link Connection#event:error} event of the underlying [`Connection`]{@link Connection}.
 *
 * @event Master#error
 * @type {Error}
 */

/**
 * Represents a MODBUS master (client).
 *
 * @constructor
 * @extends {external:EventEmitter}
 * @param {Master.Options|object} options The options object.
 * @example
 * var modbus = require('h5.modbus');
 *
 * var connection = new modbus.connections.TcpConnection();
 * var transport = new modbus.transports.IpTransport(connection);
 * var options = new modbus.Master.Options({transport: transport});
 * var master = new modbus.Master(options);
 *
 * master.once('connected', function()
 * {
 *   master.readHoldingRegisters(0x0000, 10, function(err, res)
 *   {
 *     if (err)
 *     {
 *       console.error(err.toString());
 *     }
 *     else if (res.isException())
 *     {
 *       console.error(res.toString());
 *     }
 *     else
 *     {
 *       console.log(res.toString());
 *     }
 *   });
 * });
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
   * @type {boolean}
   */
  this.connected = false;

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

inherits(Master, EventEmitter);

/**
 * Represents the configuration options of the [`Master`]{@link Master}.
 *
 * @constructor
 * @param {object}    options                            The options literal.
 * @param {Transport} options.transport                  The required MODBUS transport.
 * @param {boolean}  [options.suppressTransactionErrors] Whether to suppress the `error` events emitted by
 *                                                       the transactions. Defaults to `false`.
 * @param {boolean}  [options.retryOnException]          Whether requests should be retried after receiving a MODBUS
 *                                                       exception in a response. Defaults to `true`.
 * @param {number}   [options.maxConcurrentRequests]     The maximum number of requests that can be executed in
 *                                                       parallel. Defaults to `1`.
 * @param {number}   [options.defaultUnit]               The default value for the transaction's `unit` option:
 *                                                       a unit of the slave device. Defaults to `1`.
 * @param {number}   [options.defaultMaxRetries]         The default value for the transaction's `maxRetries` option:
 *                                                       a number of times a failed request should be retried.
 *                                                       Defaults to `3`.
 * @param {number}   [options.defaultTimeout]            The default value for the transaction's `timeout` option:
 *                                                       a number of milliseconds the transport should wait for
 *                                                       a response to a request before raising an error.
 *                                                       Defaults to `100`.
 * @example
 * var modbus = require('h5.modbus');
 *
 * var connection = new modbus.connections.TcpConnection();
 * var transport = new modbus.transports.IpTransport(connection);
 * var options = new modbus.Master.Options({
 *   transport: transport,
 *   suppressTransactionErrors: true,
 *   retryOnException: false,
 *   maxConcurrentRequests: 3,
 *   defaultUnit: 1,
 *   defaultMaxRetries: 1,
 *   defaultTimeout: 25
 * });
 * var master = new modbus.Master(options);
 */
Master.Options = function(options)
{
  /**
   * The underlying instance of {@link Transport} to use.
   *
   * @type {Transport}
   */
  this.transport = options.transport;

  /**
   * Whether to suppress the [`error`]{@link Transaction#event:error} events emitted by
   * the [`Transactions`]{@link Transaction}.
   *
   * If the option is set to `true`, an empty function will be added to every transaction's error event, so the process
   * doesn't crash if any error is emitted and no listeners were added manually.
   *
   * @type {boolean}
   */
  this.suppressTransactionErrors = typeof options.suppressTransactionErrors === 'boolean'
    ? options.suppressTransactionErrors
    : false;

  /**
   * Whether the [`Transaction's`]{@link Transaction} [`Request`]{@link Request} should be retried after
   * receiving a MODBUS exception in a response.
   *
   * This option has no effect, if the Transaction's [`maxRetries`]{@link Transaction#getMaxRetries} option is `0`.
   *
   * @type {boolean}
   */
  this.retryOnException = typeof options.retryOnException === 'boolean'
    ? options.retryOnException
    : true;

  /**
   * The maximum number of requests that can be executed in parallel by the `Master`.
   * Must be an integer greater than or equal to `1`.
   *
   * If set to `1`, the next request will be sent to the slave only after the current request completes (i.e. receives
   * a response or times out).
   *
   * Note, that this option should be set to `1` if using the [`AsciiTransport`]{@link AsciiTransport}
   * or the [`RtuTransport`]{@link RtuTransport}, because these transports don't support multiple requests at once.
   * Even when using the [`IpTransport`]{@link IpTransport}, one should check whether the slave device can deal with
   * more than one request at a time (by observing the number of invalid responses and adjusting the value accordingly).
   *
   * Defaults to `1` request (serial).
   *
   * @type {number}
   */
  this.maxConcurrentRequests = typeof options.maxConcurrentRequests === 'number' && options.maxConcurrentRequests > 0
    ? options.maxConcurrentRequests
    : 1;

  /**
   * The default value for the [`Transaction's`]{@link Transaction} [`unit`]{@link Transaction#getUnit} option:
   * a unit of the slave device.
   *
   * This value is applied only to transactions that were created by the `Master` from the specified object literals
   * (i.e. by using the read/write helper methods and not instantiating the `Transaction` directly).
   *
   * Defaults to `1`.
   *
   * @type {number}
   */
  this.defaultUnit = typeof options.defaultUnit === 'number'
    ? options.defaultUnit
    : 1;

  /**
   * The default value for the [`Transaction's`]{@link Transaction} [`maxRetries`]{@link Transaction#getMaxRetries}
   * option: a number of times a failed request should be retried.
   *
   * This value is applied only to transactions that were created by the `Master` from the specified object literals
   * (i.e. by using the read/write helper methods and not instantiating the `Transaction` directly).
   *
   * Defaults to `3` attempts.
   *
   * @type {number}
   */
  this.defaultMaxRetries = typeof options.defaultMaxRetries === 'number' && options.defaultMaxRetries >= 0
    ? options.defaultMaxRetries
    : 3;

  /**
   * The default value for the [`Transaction's`]{@link Transaction} [`timeout`]{@link Transaction#getTimeout}
   * option: a number of milliseconds to the transport should wait for a response to a request before raising an error.
   *
   * This value is applied only to transactions that were created by the `Master` from the specified object literals
   * (i.e. by using the read/write helper methods and not instantiating the `Transaction` directly).
   *
   * Defaults to `100` milliseconds.
   *
   * @type {number}
   */
  this.defaultTimeout = typeof options.defaultTimeout === 'number' && options.defaultTimeout > 0
    ? options.defaultTimeout
    : 100;
};

/**
 * Destroys this instance.
 *
 * This method should be used to clean up after the `Master's` instance is no longer needed.
 * Calling this method will remove all event listeners, destroy the underlying transport, connection and transactions.
 *
 * After calling this method, the object is no longer usable.
 *
 * @example
 * var master = require('h5.modbus').createMaster();
 *
 * master.once('connected', function()
 * {
 *   master.destroy();
 *   master = null;
 * });
 */
Master.prototype.destroy = function()
{
  this.removeAllListeners();

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
 * Returns the underlying `{@link Transport}`.
 *
 * @returns {Transport} The underlying transport.
 * @example
 * var master = require('h5.modbus').createMaster();
 *
 * master.getTransport().getConnection().on('open', function()
 * {
 *   console.log('[connection#open]');
 * });
 */
Master.prototype.getTransport = function()
{
  return this.transport;
};

/**
 * Returns the underlying `{@link Connection}`.
 *
 * The connection is taken directly from the underlying `{@link Transport}`, so calling this method is the same as:
 *
 * ```js
 * var connection = master.getTransport().getConnection();
 * ```
 *
 * @returns {Connection} The underlying connection.
 * @example
 * var master = require('h5.modbus').createMaster();
 *
 * master.getConnection().on('data', function(buffer)
 * {
 *   console.log('[connection#data] %s', buffer.inspect());
 * });
 */
Master.prototype.getConnection = function()
{
  return this.connection;
};

/**
 * Determines whether the connection to the slave is established.
 *
 * @returns {boolean} `true` if the connection is open; `false` otherwise.
 * @example
 * var master = require('h5.modbus').createMaster();
 *
 * console.log('isConnected=%s', master.isConnected());
 *
 * master.once('connected', function()
 * {
 *   console.log('[master#connected] isConnected=%s', master.isConnected());
 * });
 */
Master.prototype.isConnected = function()
{
  return this.connection.isOpen();
};

/**
 * Executes the specified `{@link Transaction}`.
 *
 * If the number of currently executing transactions is less than the value
 * of the [`maxConcurrentRequests`]{@link Master.Options#maxConcurrentRequests} option, then the specified transaction
 * is executed immediately; otherwise, the transaction is queued and executed after all currently running transactions
 * are completed.
 *
 * If
 *
 * @param {Transaction|Master~TransactionOptions} options The transaction to execute or the transaction options to
 *                                                        create and execute the transaction.
 * @returns {Transaction} The specified or the created transaction that is scheduled to be executed.
 * @throws {Error} If any of the specified transaction options are invalid.
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

  this.queueRepeatableTransactions();
  this.executeQueuedTransactions();

  this.emit('connected');
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
    transaction.on('error', ERROR_SUPPRESSION_FUNCTION);
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
