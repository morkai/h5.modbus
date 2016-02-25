// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const EventEmitter = require('events').EventEmitter;
const ExceptionCode = require('./ExceptionCode');
const FunctionCode = require('./FunctionCode');
const Response = require('./Response');
const ExceptionResponse = require('./messages/ExceptionResponse');
const responses = require('./messages').responses;

/**
 * The MODBUS slave (server).
 */
class Slave extends EventEmitter
{
  /**
   * @param {SlaveOptions} options
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:Slave, RemoteClient)}
     */
    this.onRemoteClient = this.onRemoteClient.bind(this);

    /**
     * @type {Listener}
     */
    this.listener = this.setUpListener(options.listener);

    /**
     * @type {Transport}
     */
    this.transport = options.transport;

    /**
     * @private
     * @type {handleRequestCallback}
     */
    this.requestHandler = options.requestHandler;

    /**
     * @private
     * @type {boolean}
     */
    this.suppressClientErrors = options.suppressClientErrors !== false;

    /**
     * @private
     * @type {boolean}
     */
    this.maxClients = options.maxClients || 0;

    /**
     * @private
     * @type {Set<RemoteClient>}
     */
    this.clients = new Set();
  }

  /**
   * @param {boolean} recursive
   */
  destroy(recursive)
  {
    this.removeAllListeners();
    this.destroyTransport(recursive);
    this.destroyListener(recursive);
    this.clients.clear();
  }

  /**
   * @private
   * @param {boolean} recursive
   */
  destroyTransport(recursive)
  {
    if (!this.transport)
    {
      return;
    }

    if (recursive)
    {
      this.transport.destroy();
    }

    this.transport = null;
  }

  /**
   * @private
   * @param {Listener} listener
   * @returns {Listener}
   */
  setUpListener(listener)
  {
    listener.on('client', this.onRemoteClient);

    return listener;
  }

  /**
   * @private
   * @param {boolean} recursive
   */
  destroyListener(recursive)
  {
    if (!this.listener)
    {
      return;
    }

    this.listener.off('client', this.onRemoteClient);

    if (recursive)
    {
      this.listener.destroy();
    }

    this.listener = null;
  }

  /**
   * @private
   * @param {RemoteClient} client
   */
  onRemoteClient(client)
  {
    if (this.hasMaxClients())
    {
      client.destroy();

      return;
    }

    client.on('adu', this.handleAdu.bind(this, client));
    client.on('close', () => this.clients.delete(client));

    if (this.suppressClientErrors)
    {
      client.on('error', () => {});
    }

    this.transport.add(client);
    this.clients.add(client);
  }

  /**
   * @private
   * @returns {boolean}
   */
  hasMaxClients()
  {
    return this.maxClients > 0 && this.clients.size === this.maxClients;
  }

  /**
   * @private
   * @param {RemoteClient} client
   * @param {ApplicationDataUnit} adu
   */
  handleAdu(client, adu)
  {
    let request = null;

    try
    {
      request = adu.toRequest();
    }
    catch (err)
    {
      client.emit('error', err);
    }

    if (request)
    {
      this.handleRequest(client, adu, request);
    }
  }

  /**
   * @private
   * @param {RemoteClient} client
   * @param {ApplicationDataUnit} adu
   * @param {Request} request
   * @fires Slave#request
   */
  handleRequest(client, adu, request)
  {
    this.emit('request', {
      client: client,
      adu: adu,
      request: request
    });

    this.requestHandler(adu.unit, request, this.createRespondCallback(client, adu, request));
  }

  /**
   * @private
   * @param {RemoteClient} client
   * @param {ApplicationDataUnit} adu
   * @param {Request} request
   * @returns {respondCallback}
   */
  createRespondCallback(client, adu, request)
  {
    /**
     * @param {*} result
     * @fires Slave#response
     */
    return (result) =>
    {
      if (!this.transport)
      {
        return;
      }

      const response = this.createResponse(adu.functionCode, result);
      const pdu = response.toBuffer();
      const frame = this.transport.encode(adu.id, adu.unit, pdu);

      this.emit('response', {
        client: client,
        adu: adu,
        request: request,
        response: response
      });

      client.write(frame);
    };
  }

  /**
   * @private
   * @param {FunctionCode} functionCode
   * @param {*} result
   * @returns {Response}
   * @throws {Error} If the specified `result` is not an `ExceptionCode`, a `Response` or a `Response` options object.
   */
  createResponse(functionCode, result)
  {
    if (result == null)
    {
      throw new Error(
        'Invalid response result. '
        + 'Expected an ExceptionCode, a Response, a Response options object or a Response Buffer, '
        + `but got [${result}].`
      );
    }

    if (typeof result === 'number')
    {
      return new ExceptionResponse(functionCode, result);
    }

    if (typeof result.toBuffer === 'function')
    {
      if (result.functionCode !== functionCode)
      {
        throw new Error(
          'Invalid response result. '
          + `Expected a Response with function code ${FunctionCode[functionCode]} (${functionCode}), `
          + `but got ${FunctionCode[result.functionCode]} (${result.functionCode}).`
        );
      }

      return result;
    }

    if (typeof result.message === 'string')
    {
      return new ExceptionResponse(functionCode, ExceptionCode.SlaveDeviceFailure);
    }

    const ResponseClass = responses[functionCode];

    if (!ResponseClass)
    {
      throw new Error(
        'Invalid response result. '
        + 'Expected an options object or Buffer for an implemented MODBUS function code, '
        + `but ${FunctionCode[functionCode]} (${functionCode}) is not implemented.`
      );
    }

    return Buffer.isBuffer(result)
      ? ResponseClass.fromBuffer(result)
      : ResponseClass.fromOptions(result);
  }
}

module.exports = Slave;

/**
 * @typedef {Object} SlaveOptions
 * @property {Listener} listener
 * @property {Transport} transport
 * @property {handleRequestCallback} requestHandler
 * @property {boolean} [suppressClientErrors=true]
 */

/**
 * @event Slave#request
 * @type {Object}
 * @property {RemoteClient} client
 * @property {ApplicationDataUnit} adu
 * @property {Request} request
 */

/**
 * @event Slave#response
 * @type {Object}
 * @property {RemoteClient} client
 * @property {ApplicationDataUnit} adu
 * @property {Request} request
 * @property {Response} response
 */

/**
 * @callback respondCallback
 * @param {*} result
 */

/**
 * @callback handleRequestCallback
 * @param {number} unit
 * @param {Request} request
 * @param {respondCallback} respond
 */
