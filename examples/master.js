// Part of <http://miracle.systems/p/modbus-master> licensed under <MIT>

'use strict';

const TRANSACTIONS = 10;
const CONCURRENT_TRANSACTIONS = 20;
const FUNCTION_CODE = 1;
const QUANTITY = 8;
const INTERVAL = 0;
const DEBUG = false;
const STATS = true;

const modbus = require('../lib');
const stats = require('./stats');

// const transport = new modbus.RtuTransport({eofTimeout: 0});
const transport = new modbus.IpTransport({});
// const transport = new modbus.AsciiTransport({});
// const connection = new modbus.UdpConnection({});
// const connection = new modbus.WebSocketConnection({});
const connection = new modbus.TcpConnection({});
const master = new modbus.Master({
  transport: transport,
  connection: connection,
  maxConcurrentTransactions: CONCURRENT_TRANSACTIONS,
  defaultUnit: 1,
  defaultMaxRetries: 0
});

master.on('error', err => console.log('[error]', err.message));
master.on('open', () => console.log('[open]'));
master.on('close', () => console.log('[close]'));

if (DEBUG)
{
  connection.on('data', data => console.log('[rx]', data));
  connection.on('write', data => console.log('[tx]', data));
}

if (global.gc)
{
  setInterval(global.gc, 60000);
}

master.on('open', stats.reset.bind(stats));

master.once('open', function()
{
  if (STATS)
  {
    setInterval(stats.show.bind(stats), 1000);
  }

  for (let i = 1; i <= TRANSACTIONS; ++i)
  {
    startTransaction(i.toString(), FUNCTION_CODE, QUANTITY, INTERVAL);
  }
});

function startTransaction(id, functionCode, quantity, interval)
{
  const t = master.execute({
    id: id,
    request: {
      functionCode: functionCode,
      address: 0,
      quantity: quantity
    },
    interval: interval
  });

  t.on('error', onError);
  t.on('request', onRequest);
  t.on('response', onResponse);
}

function onError(err)
{
  console.log(`${this.id}: ${err.message}`);

  ++stats.err;
}

function onRequest(id)
{
  if (DEBUG)
  {
    console.log(`${this.id}... ${id}... @ ${new Date().toISOString()}`);
  }

  ++stats.req;
}

function onResponse(res)
{
  if (DEBUG)
  {
    console.log(`${this.id}: ${res}`);
  }

  ++stats.res;
}
