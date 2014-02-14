'use strict';

// Concise example of reading `8` discrete inputs starting from address `0x0000`
// from a MODBUS RTU slave connected through a serial port (all configuration
// options are explicitly set to default values).

var SerialPort = require('serialport').SerialPort;
var modbus = require('../lib');

// See https://github.com/voodootikigod/node-serialport#to-use for a list
// of all available options.
var serialPort = new SerialPort('/dev/ttyAMA0', {
  baudRate: 9600
});

var master = modbus.createMaster({
  transport: {
    type: 'rtu',
    // End Of Frame Timeout - after any data is received, the RTU transport
    // waits eofTimeout milliseconds, and if no more data is received, then
    // an end of frame is assumed. If more data arrives before the eofTimeout
    // ms, then the end of frame timer is restarted. Workaround for
    // "at least 3 1⁄2 character times of silence between frames"
    // in MODBUS RTU (see http://en.wikipedia.org/wiki/Modbus#Frame_format).
    eofTimeout: 10,
    connection: {
      type: 'serial',
      serialPort: serialPort
    }
  },
  suppressTransactionErrors: false,
  retryOnException: true,
  maxConcurrentRequests: 1,
  defaultUnit: 0,
  defaultMaxRetries: 3,
  defaultTimeout: 100
});

master.on('connected', function()
{
  console.log('[master#connected]');
});

master.on('disconnected', function()
{
  console.log('[master#disconnected]');
});

master.on('error', function(err)
{
  console.error('[master#error] %s', err.message);
});

var connection = master.getConnection();

connection.on('open', function()
{
  console.log('[connection#open]');
});

connection.on('close', function()
{
  console.log('[connection#close]');
});

connection.on('error', function(err)
{
  console.log('[connection#error] %s', err.message);
});

connection.on('write', function(data)
{
  console.log('[connection#write]', data);
});

connection.on('data', function(data)
{
  console.log('[connection#data]', data);
});

var transport = master.getTransport();

transport.on('request', function(transaction)
{
  console.log('[transport#request] %s', transaction.getRequest());
});

master.once('connected', function()
{
  var t1 = master.readDiscreteInputs(0x0000, 8, {
    unit: 0,
    maxRetries: 3,
    timeout: 100,
    interval: 100
  });

  t1.on('timeout', function()
  {
    console.error('[transaction#timeout]');
  });

  t1.on('error', function(err)
  {
    console.error('[transaction#error] %s', err.message);
  });

  t1.on('response', function(response)
  {
    if (response.isException())
    {
      console.error('[transaction#response] %s', response);
    }
    else
    {
      console.log('[transaction#response] %s', response);
    }
  });

  t1.on('complete', function(err, response)
  {
    if (err)
    {
      console.error('[transaction#complete] %s', err.message);
    }
    else
    {
      console.log('[transaction#complete] %s', response);
    }
  });

  t1.on('cancel', function()
  {
    console.log('[transaction#cancel]');
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
