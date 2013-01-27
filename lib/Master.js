var functions = require('./functions');
var Transport = require('./Transport');
var Transaction = require('./Transaction');

module.exports = Master;

/**
 * @name h5.modbus.Master
 * @constructor
 * @param {h5.modbus.Master.Options|object} options
 * @throws {Error}
 */
function Master(options)
{
  /**
   * @private
   * @type {h5.modbus.Master.Options}
   */
  this.options = options instanceof Master.Options
    ? options
    : new Master.Options(options);

  /**
   * @private
   * @type {h5.modbus.Transport}
   */
  this.transport = this.options.transport;

  /**
   * @private
   * @type {Array.<h5.modbus.Transaction>}
   */
  this.transactionQueue = [];

  /**
   * @private
   * @type {number}
   */
  this.executingRequests = 0;

  /**
   * @private
   * @type {Array.<h5.modbus.Transaction>}
   */
  this.repeatableTransactions = [];
}

/**
 * @constructor
 * @param {object} options
 * @param {h5.modbus.Transport} options.transport
 * @param {boolean=} options.retryOnException
 * @param {number=} options.maxConcurrentRequests
 * @param {number=} options.defaultUnit
 * @param {number=} options.defaultMaxRetries
 * @param {number=} options.defaultTimeout
 * @throws {Error}
 */
Master.Options = function(options)
{
  if (!(options.transport instanceof Transport))
  {
    throw new Error("Option `transport` must be an instance of `h5.modbus.Transport`.");
  }

  /**
   * @type {h5.modbus.Transport}
   */
  this.transport = options.transport;

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

/**
 * @param {h5.modbus.Transaction|object} options
 * @return {h5.modbus.Transaction}
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
 * @param {(function|object)=} options
 * @param {number=} options.unit
 * @param {number=} options.interval
 * @param {number=} options.timeout
 * @param {number=} options.maxRetries
 * @param {function=} options.onResponse
 * @param {function=} options.onError
 * @param {function=} options.onComplete
 * @return {h5.modbus.Transaction}
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
 * @param {(function|object)=} options
 * @param {number=} options.unit
 * @param {number=} options.interval
 * @param {number=} options.timeout
 * @param {number=} options.maxRetries
 * @param {function=} options.onResponse
 * @param {function=} options.onError
 * @param {function=} options.onComplete
 * @return {h5.modbus.Transaction}
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
 * @param {(function|object)=} options
 * @param {number=} options.unit
 * @param {number=} options.interval
 * @param {number=} options.timeout
 * @param {number=} options.maxRetries
 * @param {function=} options.onResponse
 * @param {function=} options.onError
 * @param {function=} options.onComplete
 * @return {h5.modbus.Transaction}
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
 * @param {(function|object)=} options
 * @param {number=} options.unit
 * @param {number=} options.interval
 * @param {number=} options.timeout
 * @param {number=} options.maxRetries
 * @param {function=} options.onResponse
 * @param {function=} options.onError
 * @param {function=} options.onComplete
 * @return {h5.modbus.Transaction}
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
 * @private
 * @param {ModbusFunction} request
 * @param {(function|object)=} options
 * @return {h5.modbus.Transaction}
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
 * @param {h5.modbus.Transaction|object} options
 * @return {h5.modbus.Transaction}
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
 * @param {h5.modbus.Transaction} transaction
 */
Master.prototype.addRepeatableTransaction = function(transaction)
{
  var repeatableTransactions = this.repeatableTransactions;
  var transactionIndex = repeatableTransactions.length;

  repeatableTransactions.push(transaction);

  transaction.once('cancel', function()
  {
    repeatableTransactions.splice(transactionIndex, 1);
  });
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
 * @param {h5.modbus.Transaction} transaction
 * @param {Error} error
 * @param {h5.modbus.functions.Response} response
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
 * @param {h5.modbus.Transaction} transaction
 */
Master.prototype.handleError = function(transaction)
{
  if (transaction.shouldRetry())
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {h5.modbus.Transaction} transaction
 * @param {h5.modbus.functions.Response} response
 */
Master.prototype.handleResponse = function(transaction, response)
{
  if (response.isException()
    && transaction.shouldRetry()
    && this.options.retryOnException)
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {h5.modbus.Transaction} transaction
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