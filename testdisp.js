const { DisplayManager, mcu, netDMGRight } = require('./lib/display.js');
const display = new DisplayManager();

display.pageChange('L', 11); // L2
display.pageChange('R', 9); // FC