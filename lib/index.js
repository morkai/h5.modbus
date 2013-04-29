'use strict';

var Master = require('./Master');

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

  switch (options.type || 'ip')
  {
    case 'ip':
      return new (require('./transports/IpTransport'))(
        createConnection(options.connection)
      );

    case 'ascii':
      return new (require('./transports/AsciiTransport'))(
        createConnection(options.connection)
      );

    case 'rtu':
      options.connection = createConnection(options.connection);

      return new (require('./transports/RtuTransport'))(options);

    default:
      throw new Error("Unknown transport type: " + options.type);
  }
}

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

  switch (options.type || 'tcp')
  {
    case 'tcp':
      return new (require('./connections/TcpConnection'))(options);

    case 'udp':
      return new (require('./connections/UdpConnection'))(options);

    case 'serial':
      return new (require('./connections/SerialConnection'))(
        options.serialPort
      );

    default:
      throw new Error("Unknown connection type: " + options.type);
  }
}

module.exports = {
  createMaster: createMaster
};
