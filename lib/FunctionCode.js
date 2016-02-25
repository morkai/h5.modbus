// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

/**
 * @enum {number}
 */
const FunctionCode = {
	ReadDiscreteInputs: 0x02,
	ReadCoils: 0x01,
	WriteSingleCoil: 0x05,
	WriteMultipleCoils: 0x0F,
	ReadInputRegisters: 0x04,
	ReadHoldingRegisters: 0x03,
	WriteSingleRegister: 0x06,
	WriteMultipleRegisters: 0x10,
	ReadWriteMultipleRegisters: 0x17,
	MaskWriteRegister: 0x16,
	ReadFifoQueue: 0x18,
	ReadFileRecord: 0x14,
	WriteFileRecord: 0x15,
	ReadExceptionStatus: 0x07,
	Diagnostic: 0x08,
	GetComEventCounter: 0x0B,
	GetComEventLog: 0x0C,
	ReportServerId: 0x11,
	ReadDeviceIdentification: 0x2B,
	Exception: 0x80
};

Object.keys(FunctionCode).forEach(k => { FunctionCode[FunctionCode[k]] = k; });

module.exports = FunctionCode;
