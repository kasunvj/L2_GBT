const { exec } = require("child_process");
const EventEmitter = require('events');

class GPIO extends EventEmitter {
	constructor(pin, dir, val) {
		super(); // This is the missing line
		this.pin = pin;
		this.dir = dir;
		this.val = val;
		this.timeoutId = null;
		this.create();
	}

	create() {
		return new Promise((resolve) => {
			exec('echo ' + (this.pin).toString() + ' > /sys/class/gpio/export', (error, stdout, stderr) => {
				if (error) {
					// console.log(error);
					return;
				}
				else if (stderr) {
					// console.log(stderr);
					return;
				}
				else {
					resolve();
				}
			});

		}).then(() => {
			exec('echo ' + this.dir + ' > /sys/class/gpio/gpio' + (this.pin).toString() + '/direction', (error, stdout, stderr) => {

				if (error) {
					return;
				}
				else {
					console.log("setting gpio " + this.pin.toString() + " as " + this.dir);
				}
			});
		});
	}

	on() {
		return new Promise((resolve) => {
			exec('echo 1 > /sys/class/gpio/gpio' + this.pin.toString() + '/value', (error, stdout, stderr) => {
				if (error) {
					// console.log(error);
					return;
				}
				else if (stderr) {
					// console.log(stderr);
					return;
				}
				else {
					// console.log("On : ",this.pin);
					resolve();
				}
			});
		});
	}

	off() {
		return new Promise((resolve) => {
			exec('echo 0 > /sys/class/gpio/gpio' + this.pin.toString() + '/value', (error, stdout, stderr) => {
				if (error) {
					// console.log(error);
					return;
				}
				else if (stderr) {
					// console.log(stderr);
					return;
				}
				else {
					// console.log("Off : ",this.pin);
					resolve();
				}
			});
		});
	}

	isOn() {
		return new Promise((resolve) => {
			exec('cat < /sys/class/gpio/gpio' + this.pin.toString() + '/value', (error, stdout, stderr) => {
				if (error) {
					// console.log("Error: ",error);
					return;
				}
				//console.log("gpio "+this.pin.toString()+": ",parseInt(stdout));
				resolve(parseInt(stdout));
			});
		});
	}

	// create() {
	//   return new Promise((resolve) => {
	//     exec('echo '+ this.pin.toString() +' > /sys/class/gpio/export', (error, stdout, stderr) => {
	//       //console.log("1");
	//       exec('echo '+ this.dir.toString() +' > /sys/class/gpio/gpio'+ this.pin +'/direction', (error, stdout, stderr) => {
	//         //console.log("2");
	//         if(this.val == 1) {
	//           this.on();
	//         }
	//         else {
	//           this.off();
	//         }
	//         console.log("setting gpio "+ this.pin.toString() +" as "+this.dir);
	//         resolve();
	//         });
	//       });
	//     });
	// }

	// on() {
	//   exec('echo 1 > /sys/class/gpio/gpio'+this.pin.toString()+'/value', (error,stdout,stderr) => {
	//     //console.log("on :",this.pin);
	//   });
	// }

	// off() {
	//   exec('echo 0 > /sys/class/gpio/gpio'+this.pin.toString()+'/value', (error,stdout,stderr) => {
	//     //console.log("off :",this.pin);
	//   });
	// }

	// isOn() {
	//   return new Promise((resolve) => {
	//     exec('cat < /sys/class/gpio/gpio'+this.pin.toString()+'/value', (error,stdout,stderr) => {
	//       if(error){
	//         console.log("Error: ",error);
	//         return;
	//       }
	//       //console.log("gpio "+this.pin.toString()+": ",parseInt(stdout));
	//       resolve(parseInt(stdout));
	//       });
	//   });
	// }

	startBlink() {
		clearInterval(this.timeoutId);
		this.timeoutId = setInterval(async () => {
			await this.isOn() == 1 ? this.off() : this.on();
		}, 500);
	}

	stopBlink() {
		clearInterval(this.timeoutId);
		this.on();
	}

	OffLED() {
		clearInterval(this.timeoutId);
		this.off();
	}
};

module.exports = GPIO;
