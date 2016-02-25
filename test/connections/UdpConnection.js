/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');
var UdpConnection = require(LIB_DIR + '/connections/UdpConnection');

describe("UdpConnection", function()
{
  it("should emit error events emitted by the specified dgram.Socket", function()
  {
    var socket = new EventEmitter();
    var conn = new UdpConnection({socket: socket});
    var expectedHits = [new Error("ERROR!")];
    var actualHits = [];

    conn.on('error', function(err)
    {
      actualHits.push(err);
    });

    socket.emit('error', expectedHits[0]);

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit message events emitted by the specified dgram.Socket as data events", function()
  {
    var socket = new EventEmitter();
    var conn = new UdpConnection({socket: socket});
    var expectedHits = [new Buffer(7)];
    var actualHits = [];

    conn.on('data', function(data)
    {
      actualHits.push(data);
    });

    socket.emit('message', expectedHits[0]);

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit listening events emitted by the specified dgram.Socket as open events", function()
  {
    var socket = new EventEmitter();
    var expectedHits = 1;
    var actualHits = 0;

    var conn = new UdpConnection({socket: socket});

    conn.on('open', function()
    {
      actualHits++;
    });

    socket.emit('listening');

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit close events emitted by the specified dgram.Socket", function()
  {
    var socket = new EventEmitter();
    var expectedHits = 1;
    var actualHits = 0;

    var conn = new UdpConnection({socket: socket});

    conn.on('close', function()
    {
      actualHits++;
    });

    socket.emit('close');

    actualHits.should.be.eql(expectedHits);
  });

  it("should use the specified instance of UdpConnection.Options", function()
  {
    var options = new UdpConnection.Options({
      socket: new EventEmitter(),
      host: '192.168.1.1',
      port: 1234
    });
    var conn = new UdpConnection(options);
    var expectedHits = 1;
    var actualHits = 0;

    conn.on('data', function()
    {
      ++actualHits;
    });

    options.socket.emit('message', new Buffer(7));

    actualHits.should.be.equal(expectedHits);
  });

  describe("write", function()
  {
    it("should delegate to a send method of the specified dgram.Socket", function()
    {
      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var expectedHits = 1;
      var actualHits = 0;

      socket.send = function()
      {
        ++actualHits;
      };

      conn.write(new Buffer(7));

      actualHits.should.be.equal(expectedHits);
    });

    it("should call the send method with the specified buffer as the 1st argument (message)", function()
    {
      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var expectedData = new Buffer(7);
      var actualData = null;

      socket.send = function(message)
      {
        actualData = message;
      };

      conn.write(expectedData);

      actualData.should.be.equal(expectedData);
    });

    it("should call the send method with 0 as the 2nd argument (offset)", function()
    {
      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var expectedOffset = 0;
      var actualOffset = -1;

      socket.send = function(a, offset)
      {
        actualOffset = offset;
      };

      conn.write(new Buffer(7));

      actualOffset.should.be.equal(expectedOffset);
    });

    it("should call the send method with a length of the specified buffer as the 3rd argument (length)", function()
    {
      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var data = new Buffer(7);
      var expectedLength = data.length;
      var actualLength = -1;

      socket.send = function(a, b, length)
      {
        actualLength = length;
      };

      conn.write(data);

      actualLength.should.be.equal(expectedLength);
    });

    it("should, by default, call the send method with 502 as the 4th argument (port)", function()
    {
      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var expectedPort = 502;
      var actualPort = -1;

      socket.send = function(a, b, c, port)
      {
        actualPort = port;
      };

      conn.write(new Buffer(7));

      actualPort.should.be.equal(expectedPort);
    });

    it("should, by default, call the send method with 127.0.0.1 as the 5th argument (address)", function()
    {
      /*jshint maxparams:999*/

      var socket = new EventEmitter();
      var conn = new UdpConnection({socket: socket});
      var expectedAddress = '127.0.0.1';
      var actualAddress = -1;

      socket.send = function(a, b, c, d, address)
      {
        actualAddress = address;
      };

      conn.write(new Buffer(7));

      actualAddress.should.be.equal(expectedAddress);
    });

    it("should call the send method with the specified port as the 4th argument", function()
    {
      var socket = new EventEmitter();
      var expectedPort = 8080;
      var conn = new UdpConnection({socket: socket, port: expectedPort});
      var actualPort = -1;

      socket.send = function(a, b, c, port)
      {
        actualPort = port;
      };

      conn.write(new Buffer(7));

      actualPort.should.be.equal(expectedPort);
    });

    it("should call the send method with the specified host as the 5th argument", function()
    {
      /*jshint maxparams:999*/

      var socket = new EventEmitter();
      var expectedAddress = '192.168.1.1';
      var conn = new UdpConnection({socket: socket, host: expectedAddress});
      var actualAddress = -1;

      socket.send = function(a, b, c, d, address)
      {
        actualAddress = address;
      };

      conn.write(new Buffer(7));

      actualAddress.should.be.equal(expectedAddress);
    });

    it("should emit exceptions thrown by the Socket.write() as error events", function()
    {
      var socket = new EventEmitter();
      var expectedError = new Error();
      var actualError = null;

      socket.send = function()
      {
        throw expectedError;
      };

      var conn = new UdpConnection({socket: socket});

      conn.on('error', function(err)
      {
        actualError = err;
      });

      conn.write(new Buffer(7));

      actualError.should.be.equal(expectedError);
    });

    it("should emit a write event with the specified data as the first argument", function()
    {
      var socket = new EventEmitter();
      var expectedHits = [[new Buffer(10)]];
      var actualHits = [];

      socket.send = function() {};

      var conn = new UdpConnection({socket: socket});

      conn.on('write', function()
      {
        actualHits.push(arguments);
      });

      conn.write.apply(conn, expectedHits[0]);

      actualHits.should.be.eql(expectedHits);
    });

    it("should emit a write event even if the Socket.send() threw", function()
    {
      var socket = new EventEmitter();
      var expectedHits = [[new Buffer(10)]];
      var actualHits = [];
      var expectedError = new Error("FAKE Socket.send()");
      var actualError = null;

      socket.send = function() { throw expectedError; };

      var conn = new UdpConnection({socket: socket});

      conn.on('error', function(err)
      {
        actualError = err;
      });
      conn.on('write', function()
      {
        actualHits.push(arguments);
      });

      conn.write.apply(conn, expectedHits[0]);

      actualHits.should.be.eql(expectedHits);
      actualError.should.be.equal(expectedError);
    });
  });

  describe("destroy", function()
  {
    it("should remove all listeners", function()
    {
      var socket = new EventEmitter();
      var spy = sinon.spy();

      socket.close = function() {};

      var conn = new UdpConnection({socket: socket});

      conn.on('test', spy);

      conn.destroy();

      conn.emit('test', 'test');

      sinon.assert.notCalled(spy);
    });

    it("should remove all listeners from the SerialPort", function()
    {
      var socket = new EventEmitter();
      var spy = sinon.spy();

      socket.close = function() {};
      socket.on('test', spy);

      var conn = new UdpConnection({socket: socket});

      conn.destroy();

      socket.emit('test', 'test');

      sinon.assert.notCalled(spy);
    });

    it("should close the SerialPort", function()
    {
      var socket = new EventEmitter();
      var spy = sinon.spy();

      socket.close = spy;

      var conn = new UdpConnection({socket: socket});

      conn.destroy();

      sinon.assert.calledOnce(spy);
    });

    it("should not throw if called multiple times", function()
    {
      var socket = new EventEmitter();

      socket.close = function() {};

      var conn = new UdpConnection({socket: socket});

      function test()
      {
        conn.destroy();
        conn.destroy();
        conn.destroy();
        conn.destroy();
      }

      test.should.not.throw();
    });
  });

  describe("isOpen", function()
  {
    it("should return true if the address() method of the specified dgram.Socket doesn't throw", function()
    {
      var socket = new EventEmitter();
      socket.address = function() {};

      var conn = new UdpConnection({socket: socket});

      conn.isOpen().should.be.equal(true);
    });

    it("should return false if the address() method of the specified dgram.Socket throws", function()
    {
      var socket = new EventEmitter();
      socket.address = function() { throw new Error("Not bound!"); };

      var conn = new UdpConnection({socket: socket});

      conn.isOpen().should.be.equal(false);
    });
  });
});
