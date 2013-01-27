var should = require('should');
var errors = require('../lib/errors');

describe("errors", function()
{
  describe("ResponseTimeoutError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.ResponseTimeoutError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.ResponseTimeoutError.super_);
      errors.ResponseTimeoutError.super_.should.be.equal(Error);
    });
  });

  describe("InvalidChecksumError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.InvalidChecksumError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.InvalidChecksumError.super_);
      errors.InvalidChecksumError.super_.should.be.equal(Error);
    });
  });

  describe("InvalidResponseDataError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.InvalidResponseDataError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.InvalidResponseDataError.super_);
      errors.InvalidResponseDataError.super_.should.be.equal(Error);
    });
  });

  describe("IncompleteResponseFrameError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.IncompleteResponseFrameError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.IncompleteResponseFrameError.super_);
      errors.IncompleteResponseFrameError.super_.should.be.equal(Error);
    });
  });


});
