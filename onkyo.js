var fs = require('fs');
var SerialPort = require('serialport');
var port = new SerialPort('/dev/ttyUSB0', {
	parser: SerialPort.parsers.byteDelimiter([26]),
	baudRate: 9600,
	autoOpen: false
});

var contents = fs.readFileSync('sources.json');
var sources = JSON.parse(contents);

var CMD_POWER		= 'PWR';
var CMD_MASTERVOL	= 'MVL';
var CMD_INPUT		= 'SLI';
var CMD_Z2_POWER	= 'ZPW';
var CMD_Z2_VOLUME	= 'ZVL';
var CMD_Z2_INPUT	= 'SLZ';

var write_cmd = function(cmd) {
	if (port.isOpen()) {
		port.write('!1' + cmd + '\r');
	}
};

var connect = function() {
	if (!port.isOpen()) {
		port.open();
	}
};

var onkyo_status = {
	master: {
		power: false,
		volume: 0,
		source: ''
	},
	zone2: {
		power: false,
		volume: 0,
		source: ''
	}
};

var query_status = function() {
	console.log('querying status.');
	write_cmd('PWRQSTN');
	write_cmd('MVLQSTN');
	write_cmd('SLIQSTN');
	write_cmd('ZPWQSTN');
	write_cmd('ZVLQSTN');
	write_cmd('SLZQSTN');
	write_cmd('LMDQSTN');
};

var process_message = function(message) {
	format_str = /\!1([A-Z]{3})(.{2})?/g;
	match = format_str.exec(message);
	cmd = match[1];
	value = match[2];
	console.log('cmd: ' + cmd + ' value: ' + value);

	switch (cmd) {
		case CMD_POWER:
			onkyo_status.master.power = (value == '01');
			break;
		case CMD_MASTERVOL:
			onkyo_status.master.volume = parseInt('0x' + value);
			break;
		case CMD_INPUT:
			onkyo_status.master.source = sources[value];
			break;
		case CMD_Z2_POWER:
			onkyo_status.zone2.power = (value == '01');
			break;
		case CMD_Z2_VOLUME:
			onkyo_status.zone2.volume = parseInt('0x' + value);
			break;
		case CMD_Z2_INPUT:
			onkyo_status.zone2.source = sources[value];
			break;
		default:
			break;
	}
};

var print_status = function() {
	console.log(onkyo_status);
};

port.on('disconnect', (err) => {
	console.log('disconnected. ' + err.message);
});

port.on('close', () => {
	console.log('closed.');
	setTimeout(connect, 100);
});

port.on('open', (err) => {
	if (err) {
		console.log('error on open ' + err);
	}
	console.log('opened.');
	query_status();
});

port.on('error', (err) => {
	console.log('error: ', err.message);
	setTimeout(connect, 100);
});

port.on('data', (data) => {
	var buffer = Buffer.from(data);
	var message = buffer.toString('utf8');
	console.log(message);
	process_message(message);
});

connect();
setTimeout(print_status, 2000);

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit.bind(process, 0));
