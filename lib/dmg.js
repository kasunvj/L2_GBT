/* Conreolling DMG Display */
/*DMG display communication variables*/

const { SerialPort } = require('serialport');
const { ByteLengthParser }= require('@serialport/parser-byte-length');
const portL2 = new SerialPort({ path: '/dev/ttyS2', baudRate: 115200 });

var totalBuftoDMG = Buffer.alloc(10);

function dmgPageChangeMsg(page){
	const pageBuf = Buffer.from(page.toString(16).padStart(2,'0'),'hex');
	const pageSwBuf = Buffer.from([0x5A,0xA5,0x07,0x82,0x00,0x84,0x5A,0x01,0x00]);
	totalBuftoDMG = Buffer.concat([pageSwBuf,pageBuf],10);
	return sendDMGMessage(totalBuftoDMG);
}

function dmgCurrencyMsg(data,port){
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5,0x06,0x82]),data],9);
	return sendDMGMessage(totalBuftoDMG,port);
}

function dmgCIDChangeMsg(data){
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5,0x05,0x82]),data],8);
	return sendDMGMessage(totalBuftoDMG);
}

function dmgLongInt(data){
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5,0x07,0x82]),data],10);
	return sendDMGMessage(totalBuftoDMG);
}

function dmgDataChangeMsg(data){
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5,0x05,0x82]),data],8);
	return sendDMGMessage(totalBuftoDMG);
}

function dmgUsernameMsg(data,len){
	const lenBuf = Buffer.from(len.toString(16).padStart(2,'0'),'hex')
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5]),lenBuf,Buffer.from([0x82]),data],6+len);
	return sendDMGMessage(totalBuftoDMG);
}

function dmgIcon(data){
	totalBuftoDMG = Buffer.concat([Buffer.from([0x5A,0xA5,0x05,0x82,0x20]),data],8)
	return sendDMGMessage(totalBuftoDMG);
}

function sendDMGMessage(sendBuf){
	console.log(sendBuf)
	try{
		portL2.write(sendBuf, function(err) {
		  if (err) {
			  return console.log('Error on write: ', err.message)
			}
		});
	} catch(error){
		console.error(error);
		return -1
	}
	return 0;
}

module.exports = {dmgPageChangeMsg, dmgCIDChangeMsg, dmgDataChangeMsg, dmgUsernameMsg, dmgIcon, dmgLongInt, dmgCurrencyMsg, portL2}
