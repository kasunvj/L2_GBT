// const fs = require('fs');
// const MCUManager = require('./mcu.js');
// const mcu = new MCUManager();
// const net = require("./net.js");
// const fifoPath = '/tmp/my_fifo';
// const config = require('../config.json');
//
// const Database = require('./db');
// const db = new Database('my_db');

const { MCUManager, objDMG } = require('./mcu.js');
const mcu = new MCUManager();

const liveDMGLeft = {
	page: 0,
	icon: 0,
	kwhLive: 0,
	battPLive: 0,
	costLive: 0,
	balLive: 0,
	timetillfullLive: 0,
	liveTimeH:0,
	liveTimeM:0,
	currLive: 0,
	voltLive: 0,
	wattLive: 0,
	ecode: 0,
};

const liveDMGRight = {
	page: 0,
	icon: 0,
	kwhLive: 0,
	battPLive: 0,
	costLive: 0,
	balLive: 0,
	timetillfullLive: 0,
	liveTimeH:0,
	liveTimeM:0,
	currLive: 0,
	voltLive: 0,
	wattLive: 0,
	ecode: 0,
};

const netDMGLeft = {
	cid: 8001,
	lastChargePt: 10,
	lastTimeH: 1,
	lastTimeM: 30,
	lastCost: 100,
	currency: "LKR",
	chargerPower: 30,
	chargerPrice: 100,
	unameFirst: "Shan      ",
	unameLast: "Madu      ",
	ubal: 1000.08 * 100,
	cProfile: 0,
	stateL2: 'IDLE',
	errorL2: "",
};

const netDMGRight = {
	cid: 8002,
	lastChargePt: 20,
	lastTimeH: 2,
	lastTimeM: 30,
	lastCost: 200,
	currency: "LKR",
	chargerPower: 20,
	chargerPrice: 200,
	unameFirst: "Shanx     ",
	unameLast: "Madux     ",
	ubal: 3000.08 * 100,
	cProfile: 1,
	stateFC: 'IDLE',
	errorFC: "",
}

let cID = Buffer.alloc(2);
let lastCharge = Buffer.alloc(2);
let lastTimeH = Buffer.alloc(2);
let lastTimeM = Buffer.alloc(2);
let liveTimeHNow = Buffer.alloc(2);
let liveTimeMNow = Buffer.alloc(2);
let lastPrice = Buffer.alloc(2);
let cpower = Buffer.alloc(2);
let cprice = Buffer.alloc(2);
let userbal = Buffer.alloc(2);

/*Charger Data - Live*/
let battNow = Buffer.alloc(2);
let kwhNow = Buffer.alloc(2);
let costNow = Buffer.alloc(2);
let balNow = Buffer.alloc(2);
let timetillfullNow = Buffer.alloc(2);
let currNow = Buffer.alloc(2);
let voltNow = Buffer.alloc(2);
let ecode = Buffer.alloc(2);

let wattLive = Buffer.alloc(2);
let kwhLive = Buffer.alloc(2);

// L2Data {
//   volt: '0',
//   curr: '0',
//   powr: '0',
//   energy: null,
//   state: 3,
//   activityState: '100',
//   netRequest: '00001000',
//   powerError: '00000000',
//   generalError: '01'
// }
// FCData {
//   volt: '0',
//   curr: '0',
//   powr: '0',
//   energy: null,
//   state: 3,
//   activityState: '100',
//   netRequest: '00000000',
//   powerError: '00000000',
//   generalError: '01'
// }

mcu.on("L2Data", (data) => {
	//   console.log("L2Data", data);
	liveDMGLeft.voltLive = data.volt;
	liveDMGLeft.currLive = data.curr;
	liveDMGLeft.wattLive = data.powr;
	liveDMGLeft.kwhLive = data.energy;
});

mcu.on("FCData", (data) => {
	//   console.log("FCData", data);
	liveDMGRight.voltLive = data.volt;
	liveDMGRight.currLive = data.curr;
	liveDMGRight.wattLive = data.powr;
	liveDMGRight.kwhLive = data.energy;
});

const EventEmitter = require('events');
class DisplayManager extends EventEmitter {
	constructor() {
		super();
		// this.i = 0;
		// this.t = 1;
		// this.f = 50;
		// this.heatWarning = 0;
		// this.networkStrength = 1;
		// this.networkConnectivity = 0;
		// this.displayString = null;
		this.timeoutIdL2 = null;
		this.timeoutIdFC = null;

		// this.transHist = null;
		// this.responseBody = null;
		// this.elapsedTime = 0;
		// this.watt = 0;
		// this.cost = 0;
	}

	pageChange(side, page = 0) {
		if (side == 'L') {
			clearInterval(this.timeoutIdL2);

			if (page == 4) {
				this.timeoutIdL2 = setInterval(() => {
					this.pageUpdateDMG('L', page);
				}, 1000);
			} else {
				this.pageUpdateDMG('L', page);
			}

		} else if (side == 'R') {
			clearInterval(this.timeoutIdFC);

			if (page == 5) {
				this.timeoutIdFC = setInterval(() => {
					this.pageUpdateDMG('R', page);
				}, 1000);
			} else {
				this.pageUpdateDMG('R', page);
			}

		}
	}

	changeDMGPage(panel, stateNo) {
		let page = 0;

		switch (panel) {
			case 'L':
				switch (stateNo) {
					case 0://Last charge
						if (liveDMGRight.page == 0) { page = 0; }
						else if (liveDMGRight.page == 1) { page = 6; }
						else if (liveDMGRight.page == 2) { page = 12; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 19; }
						else if (liveDMGRight.page == 5) { page = 25; }
						else if (liveDMGRight.page == 6) { page = 31; }
						else { page = 0; }
						liveDMGLeft.page = 0;
						liveDMGLeft.icon = 0;
						break;

					case 1://verify
						if (liveDMGRight.page == 0) { page = 1; }
						else if (liveDMGRight.page == 1) { page = 7; }
						else if (liveDMGRight.page == 2) { page = 13; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 20; }
						else if (liveDMGRight.page == 5) { page = 26; }
						else if (liveDMGRight.page == 6) { page = 32; }
						else { page = 0; }
						liveDMGLeft.page = 1;
						liveDMGLeft.icon = 0;
						break;

					case 2://select port
						if (liveDMGRight.page == 0) { page = 2; }
						else if (liveDMGRight.page == 1) { page = 8; }
						else if (liveDMGRight.page == 2) { page = 14; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 21; }
						else if (liveDMGRight.page == 5) { page = 27; }
						else if (liveDMGRight.page == 6) { page = 33; }
						else { page = 0; }
						liveDMGLeft.page = 2;
						liveDMGLeft.icon = 0;
						break;

					case 3://plug ev
						if (liveDMGRight.page == 0) { page = 3; }
						else if (liveDMGRight.page == 1) { page = 9; }
						else if (liveDMGRight.page == 2) { page = 15; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 22; }
						else if (liveDMGRight.page == 5) { page = 28; }
						else if (liveDMGRight.page == 6) { page = 34; }
						else { page = 0; }
						liveDMGLeft.page = 3;
						liveDMGLeft.icon = 0;
						break;

					case 4://charging
						if (liveDMGRight.page == 0) { page = 4; }
						else if (liveDMGRight.page == 1) { page = 10; }
						else if (liveDMGRight.page == 2) { page = 16; }
						else if (liveDMGRight.page == 3) { page = 38; }
						else if (liveDMGRight.page == 4) { page = 23; }
						else if (liveDMGRight.page == 5) { page = 29; }
						else if (liveDMGRight.page == 6) { page = 35; }
						else { page = 0; }
						liveDMGLeft.page = 4;
						liveDMGLeft.icon = 0;
						break;

					case 5://full charge //<<
						//Empty page open (page 5)
						if (liveDMGRight.page == 0) { page = 5; }
						else if (liveDMGRight.page == 1) { page = 11; }
						else if (liveDMGRight.page == 2) { page = 17; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 24; }
						else if (liveDMGRight.page == 5) { page = 30; }
						else if (liveDMGRight.page == 6) { page = 36; }
						else { page = 0; }
						liveDMGLeft.page = 5;
						liveDMGLeft.icon = 0;
						break;

					case 6:// empty page, to display, go to please wait and [present right page]
						//Empty page open (page 1)
						if (liveDMGRight.page == 0) { page = 1; }      // wait | Tap
						else if (liveDMGRight.page == 1) { page = 7; } // wait | Wait
						else if (liveDMGRight.page == 2) { page = 13; }// wait | port
						else if (liveDMGRight.page == 3) { page = 18; }// wait | user
						else if (liveDMGRight.page == 4) { page = 20; }// wait | plugin
						else if (liveDMGRight.page == 5) { page = 26; }// wait | charging
						else if (liveDMGRight.page == 6) { page = 32; }// wait | charged
						else { page = 7; }
						liveDMGLeft.page = 1;
						break;

					case 7:// empty page to display insufficient bal
						//Empty page open (page 5)
						if (liveDMGRight.page == 0) { page = 1; }
						else if (liveDMGRight.page == 1) { page = 7; }
						else if (liveDMGRight.page == 2) { page = 13; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 20; }
						else if (liveDMGRight.page == 5) { page = 26; }
						else if (liveDMGRight.page == 6) { page = 32; }
						else { page = 7; } // wait | wait
						liveDMGLeft.page = 1;
						liveDMGLeft.icon = 1;
						break;

					case 8:// empty page to display invalid card
						//Empty page open (page 5)
						if (liveDMGRight.page == 0) { page = 1; }
						else if (liveDMGRight.page == 1) { page = 7; }
						else if (liveDMGRight.page == 2) { page = 13; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 20; }
						else if (liveDMGRight.page == 5) { page = 26; }
						else if (liveDMGRight.page == 6) { page = 32; }
						else { page = 7; } // wait | wait
						liveDMGLeft.page = 1;
						liveDMGLeft.icon = 1;
						break;

					case 9:// empty page to display sys error
						//Empty page open (page 5)
						if (liveDMGRight.page == 0) { page = 1; }
						else if (liveDMGRight.page == 1) { page = 7; }
						else if (liveDMGRight.page == 2) { page = 13; }
						else if (liveDMGRight.page == 3) { page = 18; }
						else if (liveDMGRight.page == 4) { page = 20; }
						else if (liveDMGRight.page == 5) { page = 26; }
						else if (liveDMGRight.page == 6) { page = 32; }
						else { page = 7; } // wait | wait
						liveDMGLeft.page = 1;
						liveDMGLeft.icon = 1;
						break;

					default:
						console.log("Left Invalid page")
						break;
				}
				break;

			case 'R':
				switch (stateNo) {
					case 0:// last charge
						if (liveDMGLeft.page == 0) { page = 0; }
						else if (liveDMGLeft.page == 1) { page = 1; }
						else if (liveDMGLeft.page == 2) { page = 2; }
						else if (liveDMGLeft.page == 3) { page = 3; }
						else if (liveDMGLeft.page == 4) { page = 4; }
						else if (liveDMGLeft.page == 5) { page = 5; }
						else { page = 0; }
						liveDMGRight.page = 0;
						liveDMGRight.icon = 0;
						break;

					case 1:// please wait
						/*clean system error icon left and right*/
						if (liveDMGLeft.page == 0) { page = 6; }
						else if (liveDMGLeft.page == 1) { page = 7; }
						else if (liveDMGLeft.page == 2) { page = 8; }
						else if (liveDMGLeft.page == 3) { page = 9; }
						else if (liveDMGLeft.page == 4) { page = 10; }
						else if (liveDMGLeft.page == 5) { page = 11; }
						else { page = 0; }
						liveDMGRight.page = 1;
						liveDMGRight.icon = 0;
						break;

					case 2: // connect port
						if (liveDMGLeft.page == 0) { page = 12; }
						else if (liveDMGLeft.page == 1) { page = 13; }
						else if (liveDMGLeft.page == 2) { page = 14; }
						else if (liveDMGLeft.page == 3) { page = 15; }
						else if (liveDMGLeft.page == 4) { page = 16; }
						else if (liveDMGLeft.page == 5) { page = 17; }
						else { page = 0; }
						liveDMGRight.page = 2;
						liveDMGRight.icon = 0;
						break;

					case 3: // select charging mode
						if (liveDMGLeft.page == 0) { page = 18; }
						else if (liveDMGLeft.page == 1) { page = 18; }
						else if (liveDMGLeft.page == 2) { page = 18; }
						else if (liveDMGLeft.page == 3) { page = 18; }
						else if (liveDMGLeft.page == 4) { page = 38; }
						else if (liveDMGLeft.page == 5) { page = 18; }
						else { page = 0; }
						liveDMGRight.page = 3;
						liveDMGRight.icon = 0;
						break;

					case 4: // plug ev
						if (liveDMGLeft.page == 0) { page = 19; }
						else if (liveDMGLeft.page == 1) { page = 20; }
						else if (liveDMGLeft.page == 2) { page = 21; }
						else if (liveDMGLeft.page == 3) { page = 22; }
						else if (liveDMGLeft.page == 4) { page = 23; }
						else if (liveDMGLeft.page == 5) { page = 24; }
						else { page = 0; }
						liveDMGRight.page = 4;
						liveDMGRight.icon = 0;
						break;

					case 5: // charging
						if (liveDMGLeft.page == 0) { page = 25; }
						else if (liveDMGLeft.page == 1) { page = 26; }
						else if (liveDMGLeft.page == 2) { page = 27; }
						else if (liveDMGLeft.page == 3) { page = 28; }
						else if (liveDMGLeft.page == 4) { page = 29; }
						else if (liveDMGLeft.page == 5) { page = 30; }
						else { page = 0; }
						liveDMGRight.page = 5;
						liveDMGRight.icon = 0;
						break;

					case 6: // charged
						if (liveDMGLeft.page == 0) { page = 31; }
						else if (liveDMGLeft.page == 1) { page = 32; }
						else if (liveDMGLeft.page == 2) { page = 33; }
						else if (liveDMGLeft.page == 3) { page = 34; }
						else if (liveDMGLeft.page == 4) { page = 35; }
						else if (liveDMGLeft.page == 5) { page = 36; }
						else { page = 0; }
						liveDMGRight.page = 6;
						liveDMGRight.icon = 0;
						break;

					case 7: // empty page for full charge
						// right icon landing page is 1 (wait)
						if (liveDMGLeft.page == 0) { page = 6; }      // tap  | wait
						else if (liveDMGLeft.page == 1) { page = 7; } // wait | wait
						else if (liveDMGLeft.page == 2) { page = 8; } // port | wait
						else if (liveDMGLeft.page == 3) { page = 9; } // plug | wait
						else if (liveDMGLeft.page == 4) { page = 10; }// charg| wait
						else if (liveDMGLeft.page == 5) { page = 11; }// ched | wait
						else { page = 7; }
						liveDMGRight.page = 1;
						break;

					case 8: // empty page for insufficient bal
						// right icon landing page is 1 (wait)
						if (liveDMGLeft.page == 0) { page = 6; }
						else if (liveDMGLeft.page == 1) { page = 7; }
						else if (liveDMGLeft.page == 2) { page = 8; }
						else if (liveDMGLeft.page == 3) { page = 9; }
						else if (liveDMGLeft.page == 4) { page = 10; }
						else if (liveDMGLeft.page == 5) { page = 11; }
						else { page = 7; }
						liveDMGRight.page = 1;
						break;

					case 9: // empty page  for inval crd
						if (liveDMGLeft.page == 0) { page = 6; }
						else if (liveDMGLeft.page == 1) { page = 7; }
						else if (liveDMGLeft.page == 2) { page = 8; }
						else if (liveDMGLeft.page == 3) { page = 9; }
						else if (liveDMGLeft.page == 4) { page = 10; }
						else if (liveDMGLeft.page == 5) { page = 11; }
						else { page = 7; }
						liveDMGRight.page = 1;
						break;

					default:
						console.log("Invalid page")
						break;
				}
				break;

			default:
				console.log("Invalid page argument")
				break;
		}

		objDMG.dmgPageChangeMsg(page);
	}

	changeDMGData(panel, page) {
		var dmgDataBuf = Buffer.alloc(4);

		switch (panel) {
			case 'L':
				switch (page) {
					case 0://last charge[chargerID,LastCharge%,time,Cost,kwhRate]
						liveDMGLeft.icon = 0
						/* Charger ID*/
						cID = Buffer.from((netDMGLeft.cid).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x00]), cID], 4);
						objDMG.dmgCIDChangeMsg(dmgDataBuf);

						/* Last Charge %*/
						lastCharge = Buffer.from((netDMGLeft.lastChargePt).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x20]), lastCharge], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Charger Operates Power*/
						cpower = Buffer.from((netDMGLeft.chargerPower).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x40]), cpower], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Time H*/
						lastTimeH = Buffer.from((netDMGLeft.lastTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x35]), lastTimeH], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Time M*/
						lastTimeM = Buffer.from((netDMGLeft.lastTimeM).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x40]), lastTimeM], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Price (Original value should X10)*/
						lastPrice = Buffer.from((netDMGLeft.lastCost * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x60]), lastPrice], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/* Charger Operates Price per KWh*/
						cprice = Buffer.from((netDMGLeft.chargerPrice).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x80]), cprice], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						break;

					case 4://charging
						liveDMGLeft.icon = 0
						/*Energy kwh*/
						kwhNow = Buffer.from((liveDMGLeft.wattLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x65]), kwhNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Live Batt Icon*/
						objDMG.dmgIcon(this.getBattIcon('L', liveDMGLeft.battPLive));

						/*Live cost*/
						costNow = Buffer.from((liveDMGLeft.costLive * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x00]), costNow], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/*Live bal*/
						balNow = Buffer.from((liveDMGLeft.balLive * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x40]), balNow], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/*Time till full*/
						timetillfullNow = Buffer.from((liveDMGLeft.timetillfullLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x80]), timetillfullNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						
						/*live time H*/
						liveTimeHNow = Buffer.from((liveDMGLeft.liveTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x35]), liveTimeHNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						
						/*live time M*/
						liveTimeMNow = Buffer.from((liveDMGLeft.liveTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x40]), liveTimeMNow ], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						

						/*Live current*/
						currNow = Buffer.from((liveDMGLeft.currLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x60]), currNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Live volt*/
						voltNow = Buffer.from((liveDMGLeft.voltLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x80]), voltNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Live  power*/
						wattLive = Buffer.from((liveDMGLeft.wattLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x85]), wattLive], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						break;

					case 5://charged full no icon to display to display
						liveDMGLeft.icon = 0
						this.dmgTurnOffAllIcons('L')
						break;

					case 6://charging full icon
						liveDMGLeft.icon = 0
						break;

					case 7:// insufficient balance
						liveDMGLeft.icon = 1
						this.dmgTurnOffAllIcons('L')
						/*Adding icon*/
						objDMG.dmgIcon(Buffer.from([0x14, 0x00, 0xB8]))
						break;

					case 8:// inval card icon
						liveDMGLeft.icon = 1
						this.dmgTurnOffAllIcons('L')
						/*Adding icon*/
						objDMG.dmgIcon(Buffer.from([0x16, 0x00, 0xBA]))
						break;

					case 9:// error icon
						liveDMGLeft.icon = 1
						/*Reove all the icons */
						this.dmgTurnOffAllIcons('L')
						/*Adding icon*/
						objDMG.dmgIcon(Buffer.from([0x18, 0x00, 0xBC]))

						ecode = Buffer.from((2).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x42]), ecode], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						break;

					default:
						//console.log("Left Side : L2 has No such state to update data")
						this.dmgTurnOffAllIcons('L')
						break;
				}
				break;

			case 'R':
				switch (page) {
					case 0://IDELING  PAGE[chargerID,LastCharge%,time,Cost,kwhRate]
						liveDMGRight.icon = 0
						/*Charger ID*/
						cID = Buffer.from((netDMGRight.cid).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x10]), cID], 4);
						objDMG.dmgCIDChangeMsg(dmgDataBuf);

						/*Last Charge %*/
						lastCharge = Buffer.from((netDMGRight.lastChargePt).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x30]), lastCharge], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Charger Operates*/
						cpower = Buffer.from((netDMGRight.chargerPower).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x50]), cpower], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Time H*/
						lastTimeH = Buffer.from((netDMGRight.lastTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x45]), lastTimeH], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Time M*/
						lastTimeM = Buffer.from((netDMGRight.lastTimeM).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x50]), lastTimeM], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Last Price (Original value should X10)*/
						lastPrice = Buffer.from((netDMGRight.lastCost * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x70]), lastPrice], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/* Charger Operates Price per KWh*/
						cprice = Buffer.from((netDMGRight.chargerPrice).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x90]), cprice], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						break;

					case 3: /*User Page*/
						liveDMGRight.icon = 0
						/* Usr Name First*/
						const nameFirst = netDMGRight.unameFirst;
						const usernameFirstBuf = Buffer.from(nameFirst.toString('hex'));
						const dmgnameBuf1 = Buffer.concat([Buffer.from([0x13, 0x00]), usernameFirstBuf], 2 + nameFirst.length); //2 is the length of first buffer

						objDMG.dmgUsernameMsg(dmgnameBuf1, nameFirst.length);

						/* Usr Name Last*/
						const nameLast = netDMGRight.unameLast;
						const usernameLastBuf = Buffer.from(nameLast.toString('hex'));
						const dmgnameBuf2 = Buffer.concat([Buffer.from([0x14, 0x00]), usernameLastBuf], 2 + nameLast.length);
						objDMG.dmgUsernameMsg(dmgnameBuf2, nameLast.length);

						/* User Balance*/
						userbal = Buffer.from((netDMGRight.ubal).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x10]), userbal], 6);
						objDMG.dmgLongInt(dmgDataBuf);
						break;

					case 5://CHARGING
						liveDMGRight.icon = 0
						/*Live battery %*/
						battNow = Buffer.from((liveDMGRight.battPLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x70]), battNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Energy kWh*/
						kwhLive = Buffer.from((liveDMGRight.wattLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x75]), kwhLive], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/* Live Batt Icon*/
						objDMG.dmgIcon(this.getBattIcon('R', liveDMGRight.battPLive));

						/*Live cost*/
						costNow = Buffer.from((liveDMGRight.costLive * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x10]), costNow], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/*Live bal*/
						balNow = Buffer.from((liveDMGRight.balLive * 100).toString(16).padStart(8, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x50]), balNow], 6);
						objDMG.dmgLongInt(dmgDataBuf);

						/*Time till full*/
						timetillfullNow = Buffer.from((liveDMGRight.timetillfullLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x90]), timetillfullNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						
						/*live time H */
						liveTimeHNow = Buffer.from((liveDMGRight.liveTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x45]), liveTimeHNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						
						/*live time M */
						liveTimeMNow = Buffer.from((liveDMGRight.liveTimeH).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x13, 0x50]), liveTimeMNow ], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Live current*/
						currNow = Buffer.from((liveDMGRight.currLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x70]), currNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Live volt*/
						voltNow = Buffer.from((liveDMGRight.voltLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x90]), voltNow], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Live  power*/
						wattLive = Buffer.from((liveDMGRight.wattLive).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x12, 0x95]), wattLive], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);

						/*Charging mode*/
						if (netDMGRight.cProfile == 1) {
							objDMG.dmgIcon(Buffer.from([0x84, 0x00, 0x8E]));
						}
						else if (netDMGRight.cProfile == 2) {
							objDMG.dmgIcon(Buffer.from([0x86, 0x00, 0x90]));
						}
						else if (netDMGRight.cProfile == 3) {
							objDMG.dmgIcon(Buffer.from([0x88, 0x00, 0x92]));
						}
						else if (netDMGRight.cProfile == 4) {
							objDMG.dmgIcon(Buffer.from([0x90, 0x00, 0x94]));
						}
						else {
							this.dmgTurnOffAllIcons('R')
						}
						break;

					case 6://empty page
						liveDMGRight.icon = 0
						this.dmgTurnOffAllIcons('R')
						break;

					case 7:// insufficient balance
						liveDMGRight.icon = 1
						/*Reove all the icons */
						this.dmgTurnOffAllIcons('R')
						/*Adding icon*/
						objDMG.dmgIcon(Buffer.from([0x34, 0x00, 0xBE]))
						break;

					case 8:// inval card icon
						liveDMGRight.icon = 1
						/*Reove all the icons */
						this.dmgTurnOffAllIcons('R')
						/*Adding icon*/
						objDMG.dmgIcon(Buffer.from([0x36, 0x00, 0xC0]))
						break;

					case 9:// error icon
						liveDMGRight.icon = 1
						/*Reove all the icons */
						this.dmgTurnOffAllIcons('R')
						/*Adding  icon*/
						objDMG.dmgIcon(Buffer.from([0x38, 0x00, 0xC2]))

						ecode = Buffer.from((3).toString(16).padStart(4, '0'), 'hex');
						dmgDataBuf = Buffer.concat([Buffer.from([0x11, 0x44]), ecode], 4);
						objDMG.dmgDataChangeMsg(dmgDataBuf);
						break;

					default:
						this.dmgTurnOffAllIcons('R')
						break;
				}
				break;
		}
	}

	dmgTurnOffAllIcons(mySide, myPort) {
		switch (mySide) {
			case 'L':
				/*Remove all icons starting from vp number 2000 to 2020*/
				for (let i = 14; i < 20; i = i + 2) {
					var numberString = '0x' + i.toString();
					objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
				}
				break;
			case 'R':
				/*Remove all icons starting from vp number 2020 to 2040*/
				for (let i = 34; i < 40; i = i + 2) {
					var numberString = '0x' + i.toString();
					objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
				}

				/*Remove all icons starting from vp number 2084 to 2090*/
				for (let i = 84; i < 91; i = i + 2) {
					var numberString = '0x' + i.toString();
					objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
				}
				break;
		}
	}

	getBattIcon(mySide, myBattPr, myPort) {
		switch (mySide) {
			case 'L':
				if (myBattPr >= 0 && myBattPr < 10) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 40; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x40, 0x00, 0x64]); //0%
				}

				else if (myBattPr >= 10 && myBattPr < 20) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 42; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x42, 0x00, 0x66]); //10%
				}

				else if (myBattPr >= 20 && myBattPr < 30) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 44; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x44, 0x00, 0x68]); //20%
				}

				else if (myBattPr >= 30 && myBattPr < 40) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 46; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x46, 0x00, 0x6A]); //30%
				}

				else if (myBattPr >= 40 && myBattPr < 50) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 48; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x48, 0x00, 0x6C]); //40%
				}

				else if (myBattPr >= 50 && myBattPr < 60) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 50; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x50, 0x00, 0x6E]); //50%
				}
				else if (myBattPr >= 60 && myBattPr < 70) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 52; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x52, 0x00, 0x70]); //60%
				}

				else if (myBattPr >= 70 && myBattPr < 80) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 54; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x54, 0x00, 0x72]); //70%
				}

				else if (myBattPr >= 80 && myBattPr < 90) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 56; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x56, 0x00, 0x74]); //80%
				}

				else if (myBattPr >= 90 && myBattPr < 100) {
					/*Cleaning the batt stacks*/
					for (let i = 60; i > 58; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x58, 0x00, 0x76]); //90%
				}

				else if (myBattPr == 100) {
					return Buffer.from([0x60, 0x00, 0x78]); //100%
				}

				else {
					//return Buffer.from([0x18,0x00,0xBC]); //System Error L
				}
				break;

			case 'R':
				if (myBattPr >= 0 && myBattPr < 10) {
					for (let i = 82; i > 62; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x62, 0x00, 0x64]); //0%
				}

				else if (myBattPr >= 10 && myBattPr < 20) {
					for (let i = 82; i > 64; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x64, 0x00, 0x66]); //10%
				}

				else if (myBattPr >= 20 && myBattPr < 30) {
					for (let i = 82; i > 66; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x66, 0x00, 0x68]); //20%
				}

				else if (myBattPr >= 30 && myBattPr < 40) {
					for (let i = 82; i > 68; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x68, 0x00, 0x6A]); //30%
				}

				else if (myBattPr >= 40 && myBattPr < 50) {
					for (let i = 82; i > 70; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x70, 0x00, 0x6C]); //40%
				}

				else if (myBattPr >= 50 && myBattPr < 60) {
					for (let i = 82; i > 72; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x72, 0x00, 0x6E]); //50%
				}

				else if (myBattPr >= 60 && myBattPr < 70) {
					for (let i = 82; i > 74; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x74, 0x00, 0x70]); //60%
				}

				else if (myBattPr >= 70 && myBattPr < 80) {
					for (let i = 82; i > 76; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x76, 0x00, 0x72]); //70%
				}

				else if (myBattPr >= 80 && myBattPr < 90) {
					for (let i = 82; i > 78; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x78, 0x00, 0x74]); //80%
				}

				else if (myBattPr >= 90 && myBattPr < 100) {
					for (let i = 82; i > 80; i = i - 2) {
						var numberString = '0x' + i.toString();
						objDMG.dmgIcon(Buffer.from([numberString, 0x00, 0x01]), myPort)
					}
					return Buffer.from([0x80, 0x00, 0x76]); //90%
				}

				else if (myBattPr == 100) {
					return Buffer.from([0x82, 0x00, 0x78]); //100%
				}

				else {
					//return Buffer.from([0x38,0x00,0xC2]); //System Error L
				}
		}
	}

	pageUpdateDMG(newSide, newPage) {
		return new Promise((resolve, reject) => {
			if (newSide == 'L') {
				this.changeDMGPage('L', newPage);
				this.changeDMGData('L', newPage);
				console.log("--L page and data changed")
				/*If tehre is an icon to keep from the previous state pass the state saved in icon attribute*/
				console.log("--R icon:", liveDMGRight.icon)
				if (liveDMGRight.icon == 0) {
					this.changeDMGPage('R', liveDMGRight.page);
					this.changeDMGData('R', liveDMGRight.page);
					console.log("--L No iocons to on")
				}
				else {
					console.log("R changinf for icon")
					this.changeDMGPage('R', liveDMGRight.icon);
					this.changeDMGData('R', liveDMGRight.icon);
					console.log("--L icons on")
				}
				resolve();
			}
			else if (newSide == 'R') {
				this.changeDMGPage('R', newPage);
				this.changeDMGData('R', newPage);
				console.log("--R page and data changed")
				/*If tehre is an icon to keep from the previous state pass the state saved in icon attribute*/
				console.log("--L icon:", liveDMGLeft.icon)
				if (liveDMGLeft.icon == 0) {
					this.changeDMGPage('L', liveDMGLeft.page);
					this.changeDMGData('L', liveDMGLeft.page);
					console.log("--R No iocons to on")
				}
				else {
					console.log("L changing for icon")
					this.changeDMGPage('L', liveDMGLeft.icon);
					this.changeDMGData('L', liveDMGLeft.icon);
					console.log("--R icons on")
				}
				resolve();
			}
		}).catch((err) => {
			console.log("pageUpdateDMG Error:", err)
		})
	}
}

// module.exports = { DisplayManager, mcu, db };
module.exports = { DisplayManager, mcu, netDMGRight };
