'use strict';

// Concise example of reading `8` discrete inputs starting from address `0x0000`
// from a MODBUS TCP/IP slave (with all configuration options explicitly set
// to default values).

var net = require('net');
var modbus = require('../lib');

var socket = new net.Socket();

var master = modbus.createMaster({
  transport: {
    type: 'ip',
    connection: {
      type: 'tcp',
      socket: socket,
      host: '127.0.0.1',
      port: 502,
      autoConnect: true,
      autoReconnect: true,
      minConnectTime: 2500,
      maxReconnectTime: 5000
    }
  },
  suppressTransactionErrors: false,
  retryOnException: true,
  maxConcurrentRequests: 1,
  defaultUnit: 0,
  defaultMaxRetries: 3,
  defaultTimeout: 100
});

master.once('connected', function()
{
  var t1 = master.readDiscreteInputs(0x0000, 8, {
    unit: 0,
    maxRetries: 3,
    timeout: 100,
    interval: 100,
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else
      {
        console.log(response.toString());
      }
    }
  });

  setTimeout(
    function()
    {
      t1.cancel();
      master.destroy();
    },
    5000
  );
});
