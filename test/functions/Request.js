/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var functions = require(LIB_DIR + '/functions');
var Request = require(LIB_DIR + '/functions/Request');

describe("Request", function()
{
  describe("getCode", function()
  {
    it("should return the function code specified in the constructor", function()
    {
      new Request(0x01).getCode().should.be.equal(0x01);
    });
  });

  describe("fromOptions", function()
  {
    it("should throw if the specified function code is not supported", function()
    {
      function test()
      {
        Request.fromOptions(0x99);
      }

      test.should.throw();
    });

    it("should call fromOptions() of a function from the functions index", function()
    {
      var hits = 0;

      functions[0x99] = {fromOptions: function() { ++hits; }};

      Request.fromOptions({code: 0x99});

      delete functions[0x99];

      hits.should.be.equal(1);
    });

    it("should pass the specified options object to the registered fromOptions()", function()
    {
      var expectedOptions = {code: 0x99};
      var actualOptions = {};

      functions[0x99] = {fromOptions: function(options) { actualOptions = options; }};

      Request.fromOptions(expectedOptions);

      delete functions[0x99];

      actualOptions.should.be.equal(expectedOptions);
    });

    it("should return a result of the call to the registered fromOptions()", function()
    {
      functions[0x99] = {fromOptions: function() { return 1337; }};

      var result = Request.fromOptions({code: 0x99});

      delete functions[0x99];

      result.should.be.equal(1337);
    });
  });

  describe("createResponse", function()
  {
    it("should throw", function()
    {
      function test()
      {
        new Request(0x01).createResponse(new Buffer(0));
      }

      test.should.throw();
    });
  });


});
