/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var EventEmitter = require('events').EventEmitter;
var SerialConnection = require(LIB_DIR + '/connections/SerialConnection');

describe("SerialConnection", function()
{
  it("should emit error events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = [[new Error("ERROR!")]];
    var actualHits = [];

    var conn = new SerialConnection(serialPort);

    conn.on('error', function()
    {
      actualHits.push(arguments);
    });

    serialPort.emit('error', expectedHits[0][0]);

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit data events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = [[new Buffer(10)]];
    var actualHits = [];

    var conn = new SerialConnection(serialPort);

    conn.on('data', function()
    {
      actualHits.push(arguments);
    });

    serialPort.emit('data', expectedHits[0][0]);

    actualHits.should.be.eql(expectedHits);
  });

  describe("write", function()
  {
    it("should delegate to a write method of the specified SerialPort", function()
    {
      var serialPort = new EventEmitter();
      var expectedHits = [[new Buffer(10)]];
      var actualHits = [];

      serialPort.write = function()
      {
        actualHits.push(arguments);
      };

      var conn = new SerialConnection(serialPort);

      conn.write(expectedHits[0][0]);

      actualHits.should.be.eql(expectedHits);
    });

    it("should emit exceptions thrown by the SerialPort.write() as error events", function()
    {
      var serialPort = new EventEmitter();
      var expectedError = new Error();
      var actualError = null;

      serialPort.write = function()
      {
        throw expectedError;
      };

      var conn = new SerialConnection(serialPort);

      conn.on('error', function(err)
      {
        actualError = err;
      });

      conn.write(new Buffer(10));

      actualError.should.be.equal(expectedError);
    });
  });
});
