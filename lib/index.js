'use strict';

var Master = require('./Master');

/**
 * @private
 * @const
 * @type {object.<string, function(object): h5.modbus.Connection>}
 */
var connectionFactories = {
  'tcp': function createTcpConnection(options)
  {
    return new (require('./connections/TcpConnection'))(options);
  },
  'udp': function createUdpConnection(options)
  {
    return new (require('./connections/UdpConnection'))(options);
  },
  'serial': function createSerialConnection(options)
  {
    return new (require('./connections/SerialConnection'))(options.serialPort);
  }
};

/**
 * @private
 * @const
 * @type {object.<string, function(object): h5.modbus.Transport>}
 */
var transportFactories = {
  'ip': function createIpTransport(options)
  {
    return new (require('./transports/IpTransport'))(
      createConnection(options.connection)
    );
  },
  'ascii': function createAsciiTransport(options)
  {
    return new (require('./transports/AsciiTransport'))(
      createConnection(options.connection)
    );
  },
  'udp': function createUdpTransport(options)
  {
    options.connection = createConnection(options.connection);

    return new (require('./transports/RtuTransport'))(options);
  }
};

/**
 * @private
 * @param {object} options
 * @param {string=} options.type
 * @returns {h5.modbus.Connection}
 * @throws {Error} If any of the specified options are invalid.
 */
function createConnection(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'tcp';
  }

  var connectionFactory = connectionFactories[options.type];

  if (typeof connectionFactory === 'undefined')
  {
    throw new Error("Unknown connection type: " + options.type);
  }

  return connectionFactory(options);
}

/**
 * @private
 * @param {object} options
 * @param {string=} options.type
 * @param {object=} options.connection
 * @returns {h5.modbus.Transport}
 * @throws {Error} If any of the specified options are invalid.
 */
function createTransport(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'ip';
  }

  var transportFactory = transportFactories[options.type];

  if (typeof transportFactory === 'undefined')
  {
    throw new Error("Unknown transport type: " + options.type);
  }

  return transportFactory(options);
}

/**
 * @param {object} options
 * @param {object} options.transport
 * @param {boolean=} options.retryOnException
 * @param {number=} options.maxConcurrentRequests
 * @param {number=} options.defaultUnit
 * @param {number=} options.defaultMaxRetries
 * @param {number=} options.defaultTimeout
 * @returns {h5.modbus.Master}
 * @throws {Error} If any of the specified options are invalid.
 */
function createMaster(options)
{
  options.transport = createTransport(options.transport);
  options = new Master.Options(options);

  return new Master(options);
}

module.exports = {
  createMaster: createMaster
};
