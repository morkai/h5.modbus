// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const FunctionCode = require('../FunctionCode');

/** @type {Object<FunctionCode, typeof Request>} */
const requests = {};
/** @type {Object<FunctionCode, typeof Response>} */
const responses = {};

exports.requests = requests;
exports.responses = responses;

exports.ReadDiscreteInputsRequest = requests[FunctionCode.ReadDiscreteInputs] = require('./ReadDiscreteInputsRequest');
exports.ReadDiscreteInputsResponse = responses[FunctionCode.ReadDiscreteInputs] = require('./ReadDiscreteInputsResponse');
exports.ReadCoilsRequest = requests[FunctionCode.ReadCoils] = require('./ReadCoilsRequest');
exports.ReadCoilsResponse = responses[FunctionCode.ReadCoils] = require('./ReadCoilsResponse');
exports.WriteSingleCoilRequest = requests[FunctionCode.WriteSingleCoil] = require('./WriteSingleCoilRequest');
exports.WriteSingleCoilResponse = responses[FunctionCode.WriteSingleCoil] = require('./WriteSingleCoilResponse');
exports.WriteMultipleCoilsRequest = requests[FunctionCode.WriteMultipleCoils] = require('./WriteMultipleCoilsRequest');
exports.WriteMultipleCoilsResponse = responses[FunctionCode.WriteMultipleCoils] = require('./WriteMultipleCoilsResponse');
exports.ReadInputRegistersRequest = requests[FunctionCode.ReadInputRegisters] = require('./ReadInputRegistersRequest');
exports.ReadInputRegistersResponse = responses[FunctionCode.ReadInputRegisters] = require('./ReadInputRegistersResponse');
exports.ReadHoldingRegistersRequest = requests[FunctionCode.ReadHoldingRegisters] = require('./ReadHoldingRegistersRequest');
exports.ReadHoldingRegistersResponse = responses[FunctionCode.ReadHoldingRegisters] = require('./ReadHoldingRegistersResponse');
exports.WriteSingleRegisterRequest = requests[FunctionCode.WriteSingleRegister] = require('./WriteSingleRegisterRequest');
exports.WriteSingleRegisterResponse = responses[FunctionCode.WriteSingleRegister] = require('./WriteSingleRegisterResponse');
exports.WriteMultipleRegistersRequest = requests[FunctionCode.WriteMultipleRegisters] = require('./WriteMultipleRegistersRequest');
exports.WriteMultipleRegistersResponse = responses[FunctionCode.WriteMultipleRegisters] = require('./WriteMultipleRegistersResponse');
exports.ReadWriteMultipleRegistersRequest = requests[FunctionCode.ReadWriteMultipleRegisters] = require('./ReadWriteMultipleRegistersRequest');
exports.ReadWriteMultipleRegistersResponse = responses[FunctionCode.ReadWriteMultipleRegisters] = require('./ReadWriteMultipleRegistersResponse');
exports.ExceptionResponse = responses[FunctionCode.Exception] = require('./ExceptionResponse');
