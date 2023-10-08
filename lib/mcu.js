const { SerialPort } = require('/usr/lib/node_modules/serialport');
// const portS1 = new SerialPort({ path: '/dev/ttyS1', baudRate: 9600, parity: 'even' });
const { ByteLengthParser } = require('/usr/lib/node_modules/@serialport/parser-byte-length');
// const parserFixLen = portS1.pipe(new ByteLengthParser({ length: 20 }));


const objDMG = require("./dmg.js");
const portL2 = objDMG.portL2;
// const portL2 = new SerialPort({ path: '/dev/ttyS2', baudRate: 115200 });
const parserFixLenL2 = portL2.pipe(new ByteLengthParser({ length: 1 }));

const portFC = new SerialPort({ path: '/dev/ttyS1', baudRate: 9600 });
const parserFixLenFC = portFC.pipe(new ByteLengthParser({ length: 1 }));

// const obj = require("../stamp_custom_modules/mcuMsgHandle3");

const { crc16 } = require('easy-crc');
const conv = require('hex2dec');

const stateNames = {
	0: 'POWER ON',
	1: 'A1',
	2: 'A2',
	3: 'B1',
	4: 'B2',
	5: 'C1',
	6: 'C2',
	7: 'D',
	8: 'F',
	9: 'TEMP_STATE_F'
};

const netRequestNames = [
	"Update Alarm Complete",
	"Update Complete",
	"Charge Pause",
	"Vehicle Check",
	"Shedule Charge",
	"Stop Charge",
	"Start"
];

const errNames = [
	"Ground Fault",
	"Over Current Fault",
	"GFI Test Failed",
	"Stuck Contactor Error",
	"Not used",
	"Not used",
	"Under Voltage Error",
	"Over Voltage Error"
];

const genErrNames = [
	"L2 is not communicating via serial1 bus",
	"Some error",
	"Network Unavilable"
];

const EventEmitter = require('events');

class Bufloading{
	constructor(startLoading, count, packetReady, color){
		this.startLoading = startLoading
		this.count = count 
		this.packetReady = packetReady 
		this.color = color
	}
}

class MCUManager extends EventEmitter {
	constructor() {
		super();
		this.setup();
		this.totalBufIn = Buffer.alloc(20);
		this.dataBufIn = Buffer.alloc(15);
		this.checksmIn = Buffer.alloc(2);

		this.totalBufOut = Buffer.alloc(20);
		this.selectContBufOut = Buffer.alloc(1);
		this.stateCommand = Buffer.alloc(1);
		this.stopCharge = Buffer.alloc(1);
		this.errorCommand = Buffer.alloc(1);
		this.dataBufOut = Buffer.alloc(14);
		this.checksmOut = Buffer.alloc(2);

		this.state = null;
		this.activityState = null;
		this.netRequest = null;
		this.powerError = null;
		this.generalError = null;

		this.voltL2 = null;
		this.currL2 = null;
		this.powrL2 = null;
		this.kwhL2 = null;
		this.t1L2 = null;
		this.t2L2 = null;
		this.t3L2 = null;

		this.voltFC = null;
		this.currFC = null;
		this.powrFC = null;
		this.kwhFC = null;
		this.t1FC = null;
		this.t2FC = null;
		this.t3FC = null;

		this.intervalIdFC = null;
		this.intervalIdL2 = null;
	};

	// getMCUL2Data(what) {
	// 	switch (what) {
	// 		case 'msgId0':
	// 			return [this.voltL2, this.currL2, this.powrL2, '0'];
	// 			break;

	// 		case 'msgId1':
	// 			return [this.kwhL2, this.t1L2, this.t2L2, this.t3L2];
	// 			break;

	// 		default:
	// 			return [0, 0, 0, 0];
	// 			break;
	// 	}
	// }

	// getMCUFCData(what) {
	// 	switch (what) {
	// 		case 'msgId0':
	// 			return [this.voltFC, this.currFC, this.powrFC, '0'];
	// 			break;

	// 		case 'msgId1':
	// 			return [this.kwhFC, this.t1FC, this.t2FC, this.t3FC];
	// 			break;

	// 		default:
	// 			return [0, 0, 0, 0];
	// 			break;
	// 	}
	// }

	mapData(topic, state, activityState, netRequest, powerError, generalError, volt, curr, powr, energy) {
		const stateName = stateNames[state] || 'F';
		const activityStateName = {
			"ConnectorState": activityState[0],
			"PWMState": activityState[1],
			"ChargingState": activityState[2]
		};
		const netPosition = netRequest.indexOf('1');
		const netRequestName = netRequestNames[netPosition - 1] || "IDLE";

		const errPosition = powerError.indexOf('1');
		const errName = errNames[errPosition] || "";

		const genPosition = generalError.indexOf('1');
		const genName = genErrNames[genPosition] || "";

		// console.log("stateName: ", stateName);
		// console.log("activityState: ", activityStateName);
		// console.log("netRequestName: ", netRequestName);
		// console.log("errName: ", errName);
		// console.log("genName: ", genName);

		// if (netRequestName !== this.lastNetRequestName) {
		// 	this.emit("netRequest", {
		// 		"netRequest": netRequestName
		// 	});
		// 	this.lastNetRequestName = netRequestName;
		// }

		// this.emit("L2Data", {
		// 	"state": stateName,
		// 	"activityState": activityStateName,
		// 	"netRequest": netRequestName,
		// 	"powerError": errName,
		// 	"generalError": genName
		// });

		this.emit(topic, {
			"volt": volt,
			"curr": curr,
			"powr": powr,
			"energy": energy,
			"state": stateName,
			"activityState": activityStateName,
			"netRequest": netRequestName,
			"powerError": errName,
			"generalError": genName
		});
	}

	dec2bin(n) {
		return n.toString(2).padStart(8, '0')
	}

	bin2dec(binStr) {
		return parseInt(binStr, 2)
	}

	mcuMsgDecode(cobj, packet) {
		// this.totalBufIn = buffer;

		const hash = Buffer.from([0x23])

		if (Buffer.compare(hash, packet) == 0) {
			cobj.startLoading = 1;
		}

		if (cobj.startLoading == 1) {

			if (cobj.count < 19) {
				this.totalBufIn.fill(packet, cobj.count)
				//console.log("State inside packet Not ready > ",Fcharger.state)
				cobj.count = cobj.count + 1
				cobj.packetReady = 0
			}
			else {
				this.totalBufIn.fill(packet, cobj.count)
				//console.log("State inside packet ready > ",Fcharger.state)
				cobj.startLoading = 0;
				cobj.count = 0
				cobj.packetReady = 1
			}
		}

		try {
			switch (cobj.packetReady) {
				case 1:
					if (this.totalBufIn.slice(0, 1).toString('hex') == '23') {
						const msgIdIn = conv.hexToDec(this.totalBufIn.slice(9, 10).toString('hex'));
						const charger = this.totalBufIn.slice(1, 2).toString('utf8')

						// this.generalError = '0'+mcuStateL2.getGeneralError()[1];
						this.checksmIn = conv.hexToDec(this.totalBufIn.slice(16, 18).swap16().toString('hex'));
						this.dataBufIn = this.totalBufIn.slice(1, 16);

						if (conv.hexToDec(crc16('MODBUS', this.dataBufIn).toString(16)) == this.checksmIn) {
							// console.log("CRC PASSED");

							//Extracting L2 State, Activity State, networkside request, Powerside error,General error
							const decimalVal = parseInt(conv.hexToDec(this.dataBufIn.slice(1, 2).toString('hex')))
							this.state = this.bin2dec(this.dec2bin(decimalVal).slice(3, 8));
							this.activityState = this.dec2bin(decimalVal).slice(0, 3)
							this.netRequest = this.dec2bin(parseInt(conv.hexToDec(this.dataBufIn.slice(3, 4).toString('hex'))))
							this.powerError = this.dec2bin(parseInt(conv.hexToDec(this.dataBufIn.slice(6, 7).toString('hex'))))
							this.generalError = '000';

							switch (charger) {
								case 'C': //L2 Charger
									switch (msgIdIn) {
										//Extracting L2 Data
										case '0':
											this.voltL2 = conv.hexToDec((this.totalBufIn.slice(10, 12).swap16()).toString('hex'));//!Cautious! by doing that you swap 10 12 poitins in totalBufIn itself
											this.currL2 = conv.hexToDec((this.totalBufIn.slice(12, 14).swap16()).toString('hex'));
											this.powrL2 = conv.hexToDec((this.totalBufIn.slice(14, 16).swap16()).toString('hex'));
											break;
										case '1':
											this.kwhL2 = conv.hexToDec(this.totalBufIn.slice(10, 12).swap16().toString('hex'));
											this.t1L2 = conv.hexToDec(this.totalBufIn[12].toString(16));
											this.t2L2 = conv.hexToDec(this.totalBufIn[13].toString(16));
											this.t3L2 = conv.hexToDec(this.totalBufIn[14].toString(16));
											break;
									}

									// this.emit("L2Data", {
									// 	"volt": this.voltL2,
									// 	"curr": this.currL2,
									// 	"powr": this.powrL2,
									// 	"energy": this.kwhL2,
									// 	"state": this.state,
									// 	"activityState": this.activityState,
									// 	"netRequest": this.netRequest,
									// 	"powerError": this.powerError,
									// 	"generalError": this.generalError
									// });
									this.mapData("L2Data", this.state, this.activityState, this.netRequest, this.powerError, this.generalError, this.voltL2, this.currL2, this.powrL2, this.kwhL2)
									break;

								case 'c': //Fast Charger
									switch (msgIdIn) {
										case '0':
											this.voltFC = conv.hexToDec((this.totalBufIn.slice(10, 12).swap16()).toString('hex'));//!Cautious! by doing that you swap 10 12 poitins in totalBufIn itself
											this.currFC = conv.hexToDec((this.totalBufIn.slice(12, 14).swap16()).toString('hex'));
											this.powrFC = conv.hexToDec((this.totalBufIn.slice(14, 16).swap16()).toString('hex'));
											break;
										case '1':
											this.kwhFC = conv.hexToDec(this.totalBufIn.slice(10, 12).swap16().toString('hex'));
											this.t1FC = conv.hexToDec(this.totalBufIn[12].toString(16));
											this.t2FC = conv.hexToDec(this.totalBufIn[13].toString(16));
											this.t3FC = conv.hexToDec(this.totalBufIn[14].toString(16));
											break;
									}

									// this.emit("FCData", {
									// 	"volt": this.voltFC,
									// 	"curr": this.currFC,
									// 	"powr": this.powrFC,
									// 	"energy": this.kwhFC,
									// 	"state": this.state,
									// 	"activityState": this.activityState,
									// 	"netRequest": this.netRequest,
									// 	"powerError": this.powerError,
									// 	"generalError": this.generalError
									// });
									this.mapData("FCData", this.state, this.activityState, this.netRequest, this.powerError, this.generalError, this.voltFC, this.currFC, this.powrFC, this.kwhFC)
									break;
							}
						}
						else {
							console.log("CRC FAIL");
						}
					}
					break;
				default:
					break;
			}
		}
		catch (error) {
			console.error("mcuMsgDecode Error: ", error);
		}
	}

	mcuMsgEncode(controller, state, stopC, errorC, port, parser) {
		switch (controller) {
			/*1 byte*/
			case 'M': this.selectContBufOut = Buffer.from([0x4D]); break;
			case 'm': this.selectContBufOut = Buffer.from([0x6D]); break;
			default: this.selectContBufOut = Buffer.from([0x4D]); break;
		}

		switch (state) {
			/*1 byte*/
			case 'IDLE': this.stateCommand = Buffer.from([0x02]); break;
			case 'PRE_START': this.stateCommand = Buffer.from([0x04]); break;
			case 'START': this.stateCommand = Buffer.from([0x05]); break;
			case 'STOP': this.stateCommand = Buffer.from([0x06]); break;
			default: this.stateCommand = Buffer.from([0x00]); break;
		}

		switch (stopC) {
			/*1 byte*/
			case 0: this.stopCharge = Buffer.from([0x00]); break;
			case 1: this.stopCharge = Buffer.from([0x01]); break;
			default: this.stopCharge = Buffer.from([0x00]); break;
		}

		switch (errorC) {
			/*1 byte*/
			case 'GF': this.errorCommand = Buffer.from([0x01]); break;
			case 'OCF': this.errorCommand = Buffer.from([0x02]); break;
			case 'GFI': this.errorCommand = Buffer.from([0x03]); break;
			case 'SC': this.errorCommand = Buffer.from([0x04]); break;
			case 'UV': this.errorCommand = Buffer.from([0x05]); break;
			case 'OV': this.errorCommand = Buffer.from([0x06]); break;
			default: this.errorCommand = Buffer.from([0x00]); break;
		}

		this.dataBufOut = Buffer.concat([this.stateCommand, this.stopCharge, Buffer.from([0x00, 0x00, 0x00]), this.errorCommand, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])], 14)

		/*Get the checksm of 15 bytes of msg. starting from C----- */
		this.checksmOut = crc16('MODBUS', Buffer.concat([this.selectContBufOut, this.dataBufOut], 15));
		this.totalBufOut = Buffer.concat([Buffer.from([0x23]), this.selectContBufOut, this.dataBufOut, Buffer.from(this.checksmOut.toString(16).padStart(4, '0'), 'hex').swap16(), Buffer.from([0x2a, 0x0a])], 20);

		try {
			port.write(this.totalBufOut, function (err) {
				if (err) {
					return console.log('Error on write: ', err.message)
				}
				//console.log(totalBufOut.toString('hex'));
			});
		}

		catch (error) {
			console.error(error);
			return -1
		}
		return 0;
	}

	writeMCUL2Data(state = "IDLE", error = '') { // PRE_START
		this.stateL2Name = state;
		this.L2error = error;

		clearInterval(this.intervalIdL2);
		this.intervalIdL2 = setInterval(() => {
			console.log("State L2: ", this.stateL2Name, "Error: ", this.L2error);
			this.mcuMsgEncode('M', this.stateL2Name, 0, this.L2error, portL2, parserFixLenL2);
		}, 500);
	}

	writeMCUFCData(state = "IDLE", error = '') { // PRE_START
		this.stateFCName = state;
		this.FCerror = error;

		clearInterval(this.intervalIdFC);
		this.intervalIdFC = setInterval(() => {
			console.log("State FC: ", this.stateFCName, "Error: ", this.FCerror);
			this.mcuMsgEncode('m', this.stateFCName, 0, this.FCerror, portFC, parserFixLenFC);
		}, 500);
	}

	readMCUL2() {
		console.log('opened L2');
		this.writeMCUL2Data();

		let countPacketL2 = new Bufloading(0, 0, 0, '\x1b[96m');

		parserFixLenL2.on('data', (data) => {
			// console.log("L2 Data: ", data)
			this.mcuMsgDecode(countPacketL2, data);
		});
	}

	readMCUFC() {
		console.log('opened FC');
		this.writeMCUFCData();

		let countPacketFC = new Bufloading(0, 0, 0, '\x1b[95m');

		parserFixLenFC.on('data', (data) => {
			// console.log("FC Data: ", data)
			this.mcuMsgDecode(countPacketFC, data);
		});
	}

	setup() {
		// Read from MCU L2
		portL2.on('open', this.readMCUL2.bind(this));
		// Read from MCU FC
		portFC.on('open', this.readMCUFC.bind(this));
	};
};

module.exports = { MCUManager, objDMG };
