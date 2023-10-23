const { SerialPort } = require('serialport');
const { ByteLengthParser }= require('@serialport/parser-byte-length');
const portL2 = new SerialPort({ path: '/dev/ttyS2', baudRate: 115200 });

function dmgPageChangeMsg(page){
	const pageBuf = Buffer.from(page.toString(16).padStart(2,'0'),'hex');
	const pageSwBuf = Buffer.from([0x5A,0xA5,0x07,0x82,0x00,0x84,0x5A,0x01,0x00]);
	totalBuftoDMG = Buffer.concat([pageSwBuf,pageBuf],10);
	return sendDMGMessage(totalBuftoDMG);
}

function sendDMGMessage(sendBuf){
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


function dothis(){
	//dmgPageChangeMsg(0) // 1-37 
	
	let myBuf1 = Buffer.from([0x5A,0xa5,0x07,0x82,0x00,0x84,0x5a,0x01,0x00,0x2c]);
	sendDMGMessage(myBuf1)
	
}

dothis();

