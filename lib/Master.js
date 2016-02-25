// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const EventEmitter = require('events').EventEmitter;
const InvalidFrameError = require('./InvalidFrameError');
const ResponseTimeoutError = require('./ResponseTimeoutError');
const Transaction = require('./Transaction');
const messages = require('./messages');

/**
 * The MODBUS master (client).
 */
class Master extends EventEmitter
{
  /**
   * @param {MasterOptions} options
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:Master)}
     */
    this.onConnectionOpen = this.onConnectionOpen.bind(this);

    /**
     * @private
     * @type {function(this:Master)}
     */
    this.onConnectionClose = this.onConnectionClose.bind(this);

    /**
     * @private
     * @type {function(this:Master, Error)}
     */
    this.onConnectionError = this.onConnectionError.bind(this);

    /**
     * @private
     * @type {function(this:Master, Buffer)}
     */
    this.onConnectionData = this.onConnectionData.bind(this);

    /**
     * @readonly
     * @type {Connection}
     */
    this.connection = this.setUpConnection(options.connection);

    /**
     * @readonly
     * @type {Transport}
     */
    this.transport = this.setUpTransport(options.transport);

    /**
     * @private
     * @type {boolean}
     */
    this.suppressTransactionErrors = options.suppressTransactionErrors === true;

    /**
     * @private
     * @type {boolean}
     */
    this.retryOnException = options.retryOnException !== false;

    /**
     * @private
     * @type {number}
     */
    this.maxConcurrentTransactions = options.maxConcurrentTransactions || 1;

    /**
     * @private
     * @type {number}
     */
    this.defaultUnit = options.defaultUnit > 0 ? options.defaultUnit : 0;

    /**
     * @private
     * @type {number}
     */
    this.defaultMaxRetries = options.defaultMaxRetries >= 0 ? options.defaultMaxRetries : 1;

    /**
     * @private
     * @type {number}
     */
    this.defaultTimeout = options.defaultTimeout > 0 ? options.defaultTimeout : 100;

    /**
     * @private
     * @type {Map<string, Transaction>}
     */
    this.repeatableTransactions = new Map();

    /**
     * @private
     * @type {Array<Transaction>}
     */
    this.transactionQueue = [];

    /**
     * @private
     * @type {Map<Transaction, RunningTransaction>}
     */
    this.runningTransactionCache = new Map();

    /**
     * @private
     * @type {Map<Transaction, RunningTransaction>}
     */
    this.runningTransactions = new Map();

    /**
     * @private
     * @type {Map<number, RunningTransaction>}
     */
    this.runningRequests = new Map();

    /**
     * @private
     * @type {?RunningTransaction}
     */
    this.lastRunningTransaction = null;

    /**
     * @private
     * @type {boolean}
     */
    this.connected = this.connection.isOpen();

    /**
     * @private
     * @type {number}
     */
    this.nextRequestId = 0;
  }

  /**
   * @param {boolean} recursive
   */
  destroy(recursive)
  {
    this.removeAllListeners();
    this.destroyTransport(recursive);
    this.destroyConnection(recursive);
    this.destroyTransactions();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    return this.connected;
  }

  /**
   * @param {(Transaction|TransactionOptions)} options
   * @returns {Transaction}
   * @throws {Error} If the `request` option is not a valid `Request`.
   * @throws {Error} If the specified `Transaction` is already managed by another `Master`.
   * @throws {Error} If the specified `Transaction` is repeatable and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  execute(options)
  {
    const transaction = this.createTransaction(options);

    if (transaction.isRepeatable())
    {
      this.addRepeatableTransaction(transaction);
    }

    this.transactionQueue.push(transaction);
    this.runQueuedTransactions();

    return transaction;
  }

  /**
   * @param {number} startingAddress
   * @param {number} quantity
   * @param {(Object|function(?Error, ?ReadDiscreteInputsResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 2000.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  readDiscreteInputs(startingAddress, quantity, options)
  {
    return this.request(
      new messages.ReadDiscreteInputsRequest(startingAddress, quantity),
      options
    );
  }

  /**
   * @param {number} startingAddress
   * @param {number} quantity
   * @param {(Object|function(?Error, ?ReadCoilsResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 2000.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  readCoils(startingAddress, quantity, options)
  {
    return this.request(
      new messages.ReadCoilsRequest(startingAddress, quantity),
      options
    );
  }

  /**
   * @param {number} address
   * @param {boolean} state
   * @param {(Object|function(?Error, ?WriteSingleCoilResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  writeSingleCoil(address, state, options)
  {
    return this.request(
      new messages.WriteSingleCoilRequest(address, state),
      options
    );
  }

  /**
   * @param {number} startingAddress
   * @param {Array<boolean>} states
   * @param {(Object|function(?Error, ?WriteMultipleCoilsResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `states` is not an array of length between 1 and 1968.
   * @throws {Error} If the sum of `startingAddress` and `states.length` is not between 1 and 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  writeMultipleCoils(startingAddress, states, options)
  {
    return this.request(
      new messages.WriteMultipleCoilsRequest(startingAddress, states),
      options
    );
  }

  /**
   * @param {number} startingAddress
   * @param {number} quantity
   * @param {(Object|function(?Error, ?ReadInputRegistersResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 125.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  readInputRegisters(startingAddress, quantity, options)
  {
    return this.request(
      new messages.ReadInputRegistersRequest(startingAddress, quantity),
      options
    );
  }

  /**
   * @param {number} startingAddress
   * @param {number} quantity
   * @param {(Object|function(?Error, ?ReadHoldingRegistersResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 125.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  readHoldingRegisters(startingAddress, quantity, options)
  {
    return this.request(
      new messages.ReadHoldingRegistersRequest(startingAddress, quantity),
      options
    );
  }

  /**
   * @param {number} address
   * @param {number} value
   * @param {(Object|function(?Error, ?WriteSingleRegisterResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `value` is not a number between 0 and 65535.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  writeSingleRegister(address, value, options)
  {
    return this.request(
      new messages.WriteSingleRegisterRequest(address, value),
      options
    );
  }

  /**
   * @param {number} startingAddress
   * @param {Buffer} values
   * @param {(Object|function(?Error, ?WriteMultipleRegistersResponse))} [options]
   * @returns {Transaction}
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `values` is not an array of length between 1 and 1968.
   * @throws {Error} If the sum of `startingAddress` and a half of `values.length` is not between 1 and 0x10000.
   * @throws {Error} If the `id` and `interval` options are specified and a repeatable `Transaction` with the same ID
   * is already managed by this `Master`.
   */
  writeMultipleRegisters(startingAddress, values, options)
  {
    return this.request(
      new messages.WriteMultipleRegistersRequest(startingAddress, values),
      options
    );
  }

  /**
   * @private
   * @param {Request} request
   * @param {(Object|function(?Error, ?Response))} [options]
   * @returns {Transaction}
   */
  request(request, options)
  {
    let transactionOptions = options;
    let onComplete = null;

    if (typeof options === 'function')
    {
      onComplete = options;
      transactionOptions = {request: request};
    }
    else if (options == null)
    {
      transactionOptions = {request: request};
    }

    const transaction = this.execute(transactionOptions);

    if (onComplete)
    {
      transaction.on('complete', onComplete);
    }

    return transaction;
  }

  /**
   * @private
   * @param {(Transaction|TransactionOptions)} options
   * @returns {Transaction}
   * @throws {Error} If the `request` option is not a valid `Request`.
   * @throws {Error} If the specified `Transaction` is already bound to another `Master`.
   */
  createTransaction(options)
  {
    const transaction = options && typeof options.bind === 'function'
      ? options
      : new Transaction(this.applyTransactionDefaults(options));

    transaction.bind(this.onTransactionDestroy.bind(this, transaction));

    if (this.suppressTransactionErrors)
    {
      transaction.on('error', () => {});
    }

    transaction.on('timeout', this.onTransactionTimeout.bind(this));

    return transaction;
  }

  /**
   * @private
   * @param {TransactionOptions} options
   * @returns {TransactionOptions}
   */
  applyTransactionDefaults(options)
  {
    if (!options)
    {
      options = {};
    }

    if (options.unit == null)
    {
      options.unit = this.defaultUnit;
    }

    if (options.maxRetries == null)
    {
      options.maxRetries = this.defaultMaxRetries;
    }

    if (options.timeout == null)
    {
      options.timeout = this.defaultTimeout;
    }

    return options;
  }

  /**
   * @private
   * @param {Transaction} transaction
   * @throws {Error} If a different repeatable `Transaction` with the same ID is already managed by this `Master`.
   */
  addRepeatableTransaction(transaction)
  {
    if (this.repeatableTransactions.has(transaction.id))
    {
      throw new Error(`Transaction ID must be unique per each Master. [${transaction.id}] already exists.`);
    }

    this.repeatableTransactions.set(transaction.id, transaction);
  }

  /**
   * @private
   */
  destroyTransactions()
  {
    this.transactionQueue.forEach(t => t.destroy());
    this.transactionQueue = null;

    this.repeatableTransactions.forEach(t => t.destroy());
    this.repeatableTransactions = null;

    this.runningTransactions.forEach(t => t.destroy());
    this.runningTransactions = null;
  }

  /**
   * @private
   * @param {Transport} transport
   * @returns {Transport}
   */
  setUpTransport(transport)
  {
    transport.add(this);

    this.on('adu', this.handleAdu.bind(this));

    return transport;
  }

  /**
   * @private
   * @param {boolean} recursive
   */
  destroyTransport(recursive)
  {
    if (recursive)
    {
      this.transport.destroy();
    }

    this.transport = null;
  }

  /**
   * @private
   * @param {Connection} connection
   * @returns {Connection}
   */
  setUpConnection(connection)
  {
    connection.on('open', this.onConnectionOpen);
    connection.on('close', this.onConnectionClose);
    connection.on('error', this.onConnectionError);
    connection.on('data', this.onConnectionData);

    return connection;
  }

  /**
   * @private
   * @param {boolean} recursive
   */
  destroyConnection(recursive)
  {
    const connection = this.connection;

    if (connection === null)
    {
      return;
    }

    connection.off('open', this.onConnectionOpen);
    connection.off('close', this.onConnectionClose);
    connection.off('error', this.onConnectionError);
    connection.off('data', this.onConnectionData);

    if (recursive)
    {
      connection.destroy();
    }

    this.connection = null;
  }

  /**
   * @private
   */
  onConnectionOpen()
  {
    this.connected = true;

    this.transport.add(this);

    this.queueRepeatableTransactions();
    this.runQueuedTransactions();

    this.emit('open');
  }

  /**
   * @private
   */
  onConnectionClose()
  {
    if (this.connected)
    {
      this.connected = false;

      this.emit('close');
    }
  }

  /**
   * @private
   * @param {Error} err
   */
  onConnectionError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   * @param {Buffer} data
   */
  onConnectionData(data)
  {
    this.emit('data', data);
  }

  /**
   * @private
   * @param {number} requestId
   */
  onTransactionTimeout(requestId)
  {
    this.handleResult(requestId, null, new ResponseTimeoutError(), null);
    this.emit('timeout', requestId);
  }

  /**
   * @private
   * @param {Transaction} transaction
   */
  onTransactionDestroy(transaction)
  {
    // Remove from repeatable transactions
    this.repeatableTransactions.delete(transaction.id);

    // Remove from currently running transactions
    const runningTransaction = this.runningTransactions.get(transaction);

    if (runningTransaction)
    {
      this.runningRequests.delete(runningTransaction.requestId);
      this.runningTransactions.delete(transaction);
      runningTransaction.destroy();

      if (this.lastRunningTransaction === runningTransaction)
      {
        this.lastRunningTransaction = null;
      }
    }

    this.runningTransactionCache.delete(transaction);

    // Remove from queued transactions
    const queueIndex = this.transactionQueue.indexOf(transaction);

    if (queueIndex !== -1)
    {
      this.transactionQueue.splice(queueIndex, 1);
    }
  }

  /**
   * @private
   */
  queueRepeatableTransactions()
  {
    this.repeatableTransactions.forEach(t => this.transactionQueue.push(t));
  }

  /**
   * @private
   */
  runQueuedTransactions()
  {
    while (this.transactionQueue.length > 0 && this.runningTransactions.size < this.maxConcurrentTransactions)
    {
      this.runTransaction(this.transactionQueue.shift());
    }
  }

  /**
   * @private
   * @param {Transaction} transaction
   */
  runTransaction(transaction)
  {
    let runningTransaction = this.runningTransactionCache.get(transaction);

    if (!runningTransaction)
    {
      runningTransaction = new RunningTransaction(transaction, this.transport, this.connection);
    }

    this.startRunningTransaction(runningTransaction);
  }

  /**
   * @private
   * @param {RunningTransaction} runningTransaction
   */
  startRunningTransaction(runningTransaction)
  {
    const requestId = this.getNextRequestId();

    this.runningTransactions.set(runningTransaction.transaction, runningTransaction);
    this.runningRequests.set(requestId, runningTransaction);
    this.lastRunningTransaction = runningTransaction;

    runningTransaction.start(requestId);
  }

  /**
   * @private
   * @returns {number}
   */
  getNextRequestId()
  {
    if (this.nextRequestId === 0xFFFF)
    {
      this.nextRequestId = 1;
    }
    else
    {
      this.nextRequestId += 1;
    }

    return this.nextRequestId;
  }

  /**
   * @private
   * @param {ApplicationDataUnit} adu
   */
  handleAdu(adu)
  {
    let response = null;

    try
    {
      response = adu.toResponse();
    }
    catch (err)
    {
      this.emit('error', err);
    }

    if (response)
    {
      this.handleResult(adu.id, adu, null, response);
    }
  }

  /**
   * @private
   * @param {?number} requestId
   * @param {?ApplicationDataUnit} adu
   * @param {?Error} error
   * @param {?Response} response
   */
  handleResult(requestId, adu, error, response)
  {
    const runningTransaction = this.findRunningTransaction(requestId);

    if (!runningTransaction)
    {
      // Ignoring unmatched response...
      return;
    }

    const transaction = runningTransaction.transaction;

    this.runningTransactions.delete(transaction);
    this.runningRequests.delete(runningTransaction.requestId);
    this.lastRunningTransaction = null;

    if (!error)
    {
      error = runningTransaction.validate(adu);
    }

    if (error)
    {
      this.handleTransactionError(runningTransaction, error);
    }
    else
    {
      this.handleTransactionResponse(runningTransaction, adu, response);
    }

    this.runQueuedTransactions();
  }

  /**
   * @private
   * @param {RunningTransaction} runningTransaction
   * @param {Error} error
   */
  handleTransactionError(runningTransaction, error)
  {
    runningTransaction.handleError(error);

    const transaction = runningTransaction.transaction;

    if (runningTransaction.shouldRetry())
    {
      this.transactionQueue.unshift(transaction);
    }
    else if (runningTransaction.isRepeatable())
    {
      this.scheduleExecution(runningTransaction);
    }
    else
    {
      transaction.destroy();
    }
  }

  /**
   * @private
   * @param {RunningTransaction} runningTransaction
   * @param {ApplicationDataUnit} adu
   * @param {Response} response
   */
  handleTransactionResponse(runningTransaction, adu, response)
  {
    const isException = adu.isException();

    runningTransaction.handleResponse(isException, response);

    const transaction = runningTransaction.transaction;

    if (isException && this.retryOnException && runningTransaction.shouldRetry())
    {
      this.cacheRunningTransaction(runningTransaction);
      this.transactionQueue.unshift(transaction);
    }
    else if (runningTransaction.isRepeatable())
    {
      this.scheduleExecution(runningTransaction);
    }
    else
    {
      transaction.destroy();
    }
  }

  /**
   * @private
   * @param {RunningTransaction} runningTransaction
   */
  scheduleExecution(runningTransaction)
  {
    this.cacheRunningTransaction(runningTransaction);

    runningTransaction.scheduleExecution(() =>
    {
      if (this.isOpen())
      {
        this.transactionQueue.push(runningTransaction.transaction);
        this.runQueuedTransactions();
      }
    });
  }

  /**
   * @private
   * @param {?number} requestId
   * @returns {?RunningTransaction}
   */
  findRunningTransaction(requestId)
  {
    if (this.runningRequests.size === 0)
    {
      return null;
    }

    if (requestId === null)
    {
      return this.lastRunningTransaction;
    }

    return this.runningRequests.get(requestId) || null;
  }

  /**
   * @private
   * @param {RunningTransaction} runningTransaction
   */
  cacheRunningTransaction(runningTransaction)
  {
    this.runningTransactionCache.set(runningTransaction.transaction, runningTransaction);
  }
}

class RunningTransaction
{
  constructor(transaction, transport, connection)
  {
    /**
     * @type {number}
     */
    this.requestId = -1;

    /**
     * @type {Transaction}
     */
    this.transaction = transaction;

    /**
     * @private
     * @type {Transport}
     */
    this.transport = transport;

    /**
     * @private
     * @type {Connection}
     */
    this.connection = connection;

    /**
     * @private
     * @type {?Buffer}
     */
    this.frame = null;

    /**
     * @private
     * @type {number}
     */
    this.failures = 0;

    /**
     * @private
     * @type {?number}
     */
    this.timeoutTimer = null;

    /**
     * @private
     * @type {?number}
     */
    this.executionTimer = null;
  }

  destroy()
  {
    this.stopTimeout();

    if (this.executionTimer)
    {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }

    this.transaction = null;
    this.transport = null;
    this.connection = null;
    this.frame = null;
    this.pdu = null;
  }

  /**
   * @returns {boolean}
   */
  isRepeatable()
  {
    return this.transaction.isRepeatable();
  }

  /**
   * @returns {boolean}
   */
  shouldRetry()
  {
    return this.failures <= this.transaction.maxRetries;
  }

  /**
   * @param {number} requestId
   */
  start(requestId)
  {
    if (!this.frame || !this.transport.update(this.frame, requestId))
    {
      this.frame = this.transport.encode(requestId, this.transaction.unit, this.transaction.request.toBuffer());
    }

    this.requestId = requestId;
    this.timeoutTimer = setTimeout(this.onTimeout.bind(this), this.transaction.timeout);

    this.connection.write(this.frame);

    this.transaction.emit('request', requestId);
  }

  /**
   * @param {function(): void} cb
   */
  scheduleExecution(cb)
  {
    this.failures = 0;

    if (this.transaction.interval === 0)
    {
      cb();
    }
    else
    {
      this.executionTimer = setTimeout(cb, this.transaction.interval);
    }
  }

  /**
   * @param {ApplicationDataUnit} adu
   * @returns {?Error}
   */
  validate(adu)
  {
    const expectedUnit = this.transaction.unit;
    const actualUnit = adu.unit;

    if (actualUnit !== expectedUnit)
    {
      return new InvalidFrameError(
        `Invalid unit in a response to request [${adu.id}] of transaction [${this.transaction.id}]. `
        + `Expected [${expectedUnit}], but got [${actualUnit}].`
      );
    }

    const expectedFunctionCode = this.transaction.request.functionCode;
    const actualFunctionCode = adu.getRealFunctionCode();

    if (actualFunctionCode !== expectedFunctionCode)
    {
      return new InvalidFrameError(
        `Invalid function code in a response to request [${adu.id}] of transaction [${this.transaction.id}]. `
        + `Expected [${expectedFunctionCode}], but got [${actualFunctionCode}].`
      );
    }

    return null;
  }

  /**
   * @param {boolean} isException
   * @param {Response} response
   */
  handleResponse(isException, response)
  {
    this.stopTimeout();

    if (isException)
    {
      this.failures += 1;
    }
    else
    {
      this.failures = 0;
    }

    this.transaction.emit('response', response);
    this.transaction.emit('complete', null, response);
  }

  /**
   * @param {Error} error
   */
  handleError(error)
  {
    this.stopTimeout();

    this.failures += 1;

    this.transaction.emit('error', error);
    this.transaction.emit('complete', error, null);
  }

  /**
   * @private
   */
  onTimeout()
  {
    this.stopTimeout();
    this.transaction.emit('timeout', this.requestId);
  }

  stopTimeout()
  {
    if (this.timeoutTimer)
    {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}

module.exports = Master;

/**
 * @typedef {Object} MasterOptions
 * @property {Connection} connection
 * @property {Transport} transport
 * @property {boolean} [suppressTransactionErrors=false]
 * @property {boolean} [retryOnException=true]
 * @property {boolean} [maxConcurrentTransactions=1]
 * @property {boolean} [defaultUnit=1]
 * @property {boolean} [defaultMaxRetries=1]
 * @property {boolean} [defaultTimeout=100]
 */
