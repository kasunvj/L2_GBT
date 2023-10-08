const gpio = require('./lib/gpio.js');

const CardReader = require('./lib/tap.js');
const cardReader = new CardReader();

// const MCUManager = require('./lib/mcu.js');
// const mcu = new MCUManager();

const { DisplayManager, mcu, netDMGRight } = require('./lib/display.js');
const display = new DisplayManager();

async function setup() {
  let btn1 = await new gpio(4, 'in', 1);
  let btn2 = await new gpio(5, 'in', 1);
  let btn3 = await new gpio(8, 'in', 1);
  var btn4 = await new gpio(86, 'in', 1);

  let led1 = await new gpio(9, 'out', 0);
  let led2 = await new gpio(11, 'out', 0);
  let led3 = await new gpio(48, 'out', 0);
  let led4 = await new gpio(85, 'out', 0);

  setInterval(()=> checkGPIO(btn1, btn2, btn3, btn4), 100);

  // led1.stopBlink();
  // led2.stopBlink();
  // led3.stopBlink();
  // led4.stopBlink();

  led1.startBlink();
  led2.startBlink();
  led3.startBlink();
  led4.startBlink();
}

let lastPressed = [0, 0, 0, 0];
const debounceTime = 200; // 200ms debounce time

async function checkGPIO(b1, b2, b3, b4) {
  let currentTime = Date.now();

  if (await b1.isOn() == 0 && currentTime - lastPressed[0] > debounceTime) {
    console.log("Button 1 is Pressed");
    lastPressed[0] = currentTime;
  }
  if (await b2.isOn() == 0 && currentTime - lastPressed[1] > debounceTime) {
    console.log("Button 2 is Pressed");
    lastPressed[1] = currentTime;
  }
  if (await b3.isOn() == 0 && currentTime - lastPressed[2] > debounceTime) {
    console.log("Button 3 is Pressed");
    lastPressed[2] = currentTime;
  }
  if (await b4.isOn() == 0 && currentTime - lastPressed[3] > debounceTime) {
    console.log("Button 4 is Pressed");
    lastPressed[3] = currentTime;
  }
}

setup();

cardReader.on('rfidData', (data) => {
	console.log('RFID Data: ', data);
});

cardReader.on('rfidError', (error) => {
	console.log('RFID Error: ', error);
});

display.pageChange('L', 0); // L2
display.pageChange('R', 0); // FC

let i = 0;
let j = 0;

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
    let input = data.trim();
    if (input === '1') {
        mcu.writeMCUL2Data("PRE_START", "");
    } else if (input === '2') {
        mcu.writeMCUFCData("PRE_START", "");
    } else if (input === '3') {
        netDMGRight.unameFirst = "Shan     ";
    } else if (input === '4') {
        display.pageChange('L', i); // L2
        i = i + 1;
    } else if (input === '5') {
        display.pageChange('R', j); // FC
        j = j + 1;
    } else if (input === '6') {
        i = 0;
    }

});

// // Event listeners for button press
// btn1.on('buttonPressed', (pin) => {
//     console.log(`Button at GPIO ${pin} is Pressedxx`);
// });
//
// btn2.on('buttonPressed', (pin) => {
//     console.log(`Button at GPIO ${pin} is Pressedxx`);
// });
//
// btn3.on('buttonPressed', (pin) => {
//     console.log(`Button at GPIO ${pin} is Pressedxx`);
// });
//
// btn4.on('buttonPressed', (pin) => {
//     console.log(`Button at GPIO ${pin} is Pressedxx`);
// });
//
// btn1.startMonitoring();
// btn2.startMonitoring();
// btn3.startMonitoring();
// btn4.startMonitoring();
