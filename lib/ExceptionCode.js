// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

/**
 * @enum {number}
 */
const ExceptionCode = {
	/**
	 * The function code received in the query is not an allowable action for the server (or slave).
	 */
	IllegalFunctionCode: 0x01,
	/**
	 * The data address received in the query is not an allowable address for the server (or slave).
	 */
	IllegalDataAddress: 0x02,
	/**
	 * A value contained in the query data field is not an allowable value for the server (or slave).
	 */
	IllegalDataValue: 0x03,
	/**
	 * An unrecoverable error occurred while the server (or slave) was attempting to perform the requested action.
	 */
	SlaveDeviceFailure: 0x04,
	/**
	 * The server (or slave) has accepted the request and is processing it,
	 * but a long duration of time will be required to do so.
	 */
	Acknowledge: 0x05,
	/**
	 * The server (or slave) is engaged in processing a long–duration program command.
	 */
	SlaveDeviceBusy: 0x06,
	/**
	 * The server (or slave) cannot perform the program function received in the query.
	 */
	NegativeAcknowledge: 0x07,
	/**
	 * The server (or slave) attempted to read record file, but detected a parity error in the memory.
	 */
	MemoryParityError: 0x08,
	/**
	 * Gateway was unable to allocate an internal communication path from the input port
	 * to the output port for processing the request.
	 */
	GatewayPathUnavailable: 0x0A,
	/**
	 * No response was obtained from the target device.
	 */
	GatewayTargetDeviceFailedToRespond: 0x0B
};

Object.keys(ExceptionCode).forEach(k => { ExceptionCode[ExceptionCode[k]] = k; });

module.exports = ExceptionCode;
