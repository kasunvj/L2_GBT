const { SerialPort } = require('/usr/lib/node_modules/serialport');
const { ReadlineParser } = require('/usr/lib/node_modules/@serialport/parser-readline');
const portACM0 = new SerialPort({ path: '/dev/ttyACM0', baudRate: 9600});
const parserReadLn = portACM0.pipe(new ReadlineParser({ delimiter: '\r\n'}));

const EventEmitter = require('events');

class CardReader extends EventEmitter {
  constructor() {
    super();
    this.tapCard = this.tapCard.bind(this);
    this.setup();
  };

  tapCard() {
    parserReadLn.on('data', (data) => {
      try{
    		let tapCardNo = JSON.parse(data.toString('utf8'))["d"];
        this.emit('rfidData', tapCardNo.toString().replace(/,/g, '.') + '.');
    	}
    	catch(error){
    		this.emit('rfidError', error.message);
    	}
    });
  };

  setup() {
    portACM0.on('open', () => this.tapCard());
    portACM0.on('error', (error) => {
      this.emit('rfidError', error.message);
    });
  };
};

module.exports = CardReader;
