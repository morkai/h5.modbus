// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const net = require('net');
const dns = require('dns');
const dgram = require('dgram');
const Connection = require('../Connection');

/**
 * @private
 * @enum {number}
 */
const BindState = {
  Binding: 1,
  Bound: 2
};

/**
 * @private
 * @enum {number}
 */
const DnsState = {
  Unresolved: 0,
  Resolving: 1,
  Resolved: 2
};

class UdpConnection extends Connection
{
  /**
   * @param {UdpConnectionOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:UdpConnection)}
     */
    this.onSocketListening = this.onSocketListening.bind(this);

    /**
     * @private
     * @type {function(this:UdpConnection)}
     */
    this.onSocketClose = this.onSocketClose.bind(this);

    /**
     * @private
     * @type {function(this:UdpConnection, Error)}
     */
    this.onSocketError = this.onSocketError.bind(this);

    /**
     * @private
     * @type {function(this:UdpConnection, Buffer, object)}
     */
    this.onSocketMessage = this.onSocketMessage.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {UdpSocketOptions}
     */
    this.socketOptions = Object.assign({port: 502, host: 'localhost'}, options.socketOptions);

    /**
     * @private
     * @type {?Socket}
     */
    this.socket = this.setUpSocket(options.socket);

    /**
     * @private
     * @type {boolean}
     */
    this.closeOnDestroy = options.closeOnDestroy !== false;

    /**
     * @private
     * @type {boolean}
     */
    this.suppressErrorsAfterDestroy = options.suppressErrorsAfterDestroy !== false;

    /**
     * @private
     * @type {DnsState}
     */
    this.dnsState = this.getInitialDnsState();

    this.resolveDns();

    if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    this.removeAllListeners();
    this.destroySocket();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    // eslint-disable-next-line no-underscore-dangle
    return this.socket !== null && this.socket._bindState === BindState.Bound;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    // eslint-disable-next-line no-underscore-dangle
    return this.socket !== null && this.socket._bindState === BindState.Binding;
  }

  open()
  {
    if (this.dnsState !== DnsState.Resolved)
    {
      this.once('lookup', this.open.bind(this));
      this.resolveDns();

      return;
    }

    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    if (this.socket === null)
    {
      this.socket = this.setUpSocket(null);
    }

    this.socket.bind({
      port: this.socketOptions.localPort,
      startingAddress: this.socketOptions.localAddress,
      exclusive: this.socketOptions.exclusive === true
    });
  }

  close()
  {
    if (this.socket !== null)
    {
      this.socket.close();
    }
  }

  /**
   * @param {Buffer} data
   */
  write(data)
  {
    this.emit('write', data);

    if (!this.isOpen())
    {
      return;
    }

    try
    {
      this.socket.send(data, 0, data.length, this.socketOptions.port, this.socketOptions.host);
    }
    catch (err)
    {
      this.emit('error', err);
    }
  }

  /**
   * @private
   * @param {Socket} [socket]
   * @returns {Socket}
   */
  setUpSocket(socket)
  {
    if (!socket)
    {
      socket = dgram.createSocket({
        type: this.socketOptions.family === 6 ? 'udp6' : 'udp4',
        reuseAddr: this.socketOptions.reuseAddress === true
      });
    }

    socket.on('listening', this.onSocketListening);
    socket.on('close', this.onSocketClose);
    socket.on('error', this.onSocketError);
    socket.on('message', this.onSocketMessage);

    return socket;
  }

  /**
   * @private
   */
  destroySocket()
  {
    const socket = this.socket;

    if (socket === null)
    {
      return;
    }

    this.socket = null;

    socket.removeListener('open', this.onSocketListening);
    socket.removeListener('close', this.onSocketClose);
    socket.removeListener('error', this.onSocketError);
    socket.removeListener('message', this.onSocketMessage);

    if (this.suppressErrorsAfterDestroy)
    {
      socket.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      socket.close();
    }
  }

  /**
   * @private
   * @returns {DnsState}
   */
  getInitialDnsState()
  {
    if (!this.socketOptions.host)
    {
      this.socketOptions.host = 'localhost';

      return DnsState.Unresolved;
    }

    if (this.socketOptions.family === 6 && net.isIPv6(this.socketOptions.host))
    {
      this.socketOptions.host = expandIpv6(this.socketOptions.host);

      return DnsState.Resolved;
    }

    if (this.socketOptions.family === 4 && net.isIPv4(this.socketOptions.host))
    {
      return DnsState.Resolved;
    }

    return DnsState.Unresolved;
  }

  /**
   * @private
   */
  resolveDns()
  {
    if (this.dnsState !== DnsState.Unresolved)
    {
      return;
    }

    this.dnsState = DnsState.Resolving;

    dns.lookup(this.socketOptions.host, this.socketOptions.family, (err, address) =>
    {
      this.dnsState = DnsState.Resolved;

      if (err)
      {
        this.emit('error', err);
      }
      else
      {
        this.socketOptions.host = this.socketOptions.family === 6 ? expandIpv6(address) : address;
      }

      this.emit('lookup', err, address, this.socketOptions.family);
    });
  }

  /**
   * @private
   */
  onSocketListening()
  {
    this.emit('open');
  }

  /**
   * @private
   */
  onSocketClose()
  {
    this.emit('close');
  }

  /**
   * @private
   * @param {Error} err
   */
  onSocketError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   * @param {Buffer} message
   * @param {{address: string, port: number}} remoteInfo
   */
  onSocketMessage(message, remoteInfo)
  {
    if (remoteInfo.startingAddress === this.socketOptions.host && remoteInfo.port === this.socketOptions.port)
    {
      this.emit('data', message);
    }
  }
}

/**
 * @private
 * @param {string} address
 * @returns {string}
 * @see https://github.com/google/closure-library/blob/master/closure/goog/net/ipaddress.js
 */
function expandIpv6(address)
{
  if (address.length === 39)
  {
    return address;
  }

  const addressParts = address.split('::');
  let basePart = addressParts[0].split(':');
  let secondPart = addressParts.length === 1 ? [] : addressParts[1].split(':');

  if (basePart.length === 1 && basePart[0] === '')
  {
    basePart = [];
  }

  if (secondPart.length === 1 && secondPart[0] === '')
  {
    secondPart = [];
  }

  const gap = 8 - (basePart.length + secondPart.length);
  const result = [];
  let i;
  let l;

  for (i = 0, l = basePart.length; i < l; ++i)
  {
    result.push(padIpv6(basePart[i]));
  }

  for (i = 0; i < gap; ++i)
  {
    result.push('0000');
  }

  for (i = 0, l = secondPart.length; i < l; ++i)
  {
    result.push(padIpv6(secondPart[i]));
  }

  return result.join(':').toLowerCase();
}

/**
 * @private
 * @param {string} str
 * @returns {string}
 */
function padIpv6(str)
{
  while (str.length < 4)
  {
    str = `0${str}`;
  }

  return str;
}

module.exports = UdpConnection;

/**
 * @typedef {Object} UdpConnectionOptions
 * @property {Socket} [socket]
 * @property {UdpSocketOptions} [socketOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} UdpSocketOptions
 * @property {string} [host=localhost]
 * @property {number} [port=502]
 * @property {string} [localAddress]
 * @property {number} [localPort]
 * @property {number} [family=4]
 * @property {boolean} [reuseAddress=false]
 * @property {boolean} [exclusive=false]
 */
