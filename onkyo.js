//
// SETUP
//
var _		= require('lodash');
var fs		= require('fs');
var sources	= JSON.parse(fs.readFileSync('sources.json'));
var config	= JSON.parse(fs.readFileSync('config.json'));
var Promise	= require('bluebird');
var events	= require('events');
var emitter	= new events.EventEmitter();

var SerialPort	= require('serialport');
var port	= new SerialPort('/dev/ttyUSB0', {
	parser: SerialPort.parsers.byteDelimiter([26]),
	baudRate: 9600,
	autoOpen: false
});

var app		= require('express')();

//
// CONSTANTS
//
const CMD_POWER		= 'PWR';
const CMD_MASTERVOL	= 'MVL';
const CMD_INPUT		= 'SLI';
const CMD_Z2_POWER	= 'ZPW';
const CMD_Z2_VOLUME	= 'ZVL';
const CMD_Z2_INPUT	= 'SLZ';

function zero_pad_hex(value) {
	var val = parseInt(value);
	return val < 10 ? '0' + val.toString(16).toUpperCase() : val.toString(16).toUpperCase();
}

Object.prototype.getKeyIn = function( value ) {
	for ( var prop in this ) {
		if( this.hasOwnProperty( prop ) ) {
			if (typeof this[ prop ] === 'string' || this[ prop ] instanceof String) {
				var propval = this[ prop ];
			        var propvals = propval.split(',');

				if (_.includes(propvals, value))
					return prop;
			}
		}
	}
}

//
// REST API
//
app.get('/', (req, res) => {
	res.json({ message: 'Server is loaded and running.' });
});


// wait for responses for all of the following queries
var queries = [
	new Promise((resolve) => { emitter.on(CMD_POWER, resolve); }),
	new Promise((resolve) => { emitter.on(CMD_MASTERVOL, resolve); }),
	new Promise((resolve) => { emitter.on(CMD_INPUT, resolve); }),
	new Promise((resolve) => { emitter.on(CMD_Z2_POWER, resolve); }),
	new Promise((resolve) => { emitter.on(CMD_Z2_VOLUME, resolve); }),
	new Promise((resolve) => { emitter.on(CMD_Z2_INPUT, resolve); })
	];

app.get('/status', (req, res) => {
	query_status();
	Promise.all(queries)
	.then( () => {
		res.json(onkyo_status);
	});
});

// MASTER
app.get('/master/volume/:level?', (req, res) => {
	if (typeof req.params.level !== undefined && req.params.level) {
		write_cmd(CMD_MASTERVOL + zero_pad_hex(req.params.level));
		write_cmd('MVLQSTN'),
		new Promise((resolve) => { emitter.on(CMD_MASTERVOL, resolve); }).then(() => res.json(onkyo_status));

	} else {
		res.json(onkyo_status);
	}
});

app.get('/master/power/:state?', (req, res) => {
	if (typeof req.params.state !== undefined && req.params.state) {
		if (req.params.state != 'on' && req.params.state != 'off') {
			return;
		}
		write_cmd(CMD_POWER + (req.params.state == 'on' ? '01' : '00'));
		write_cmd('PWRQSTN');
		new Promise((resolve) => { emitter.on(CMD_POWER, resolve); }).then(() => res.json(onkyo_status));
	} else {
		res.json(onkyo_status);
	}
});

app.get('/master/input/:source?', (req, res) => {
	if (typeof req.params.source !== undefined && req.params.source) {
		var source = sources.getKeyIn(req.params.source);

		if (source !== undefined && source) {
			write_cmd(CMD_INPUT + source);
			write_cmd('SLIQSTN');
			new Promise((resolve) => { emitter.on(CMD_INPUT, resolve); }).then(() => res.json(onkyo_status));
		} else {
			res.json({ 'error': 'source ' + req.params.source + ' not found.' });
		}
	} else {
		res.json(onkyo_status);
	}
});

// ZONE 2
app.get('/zone2/volume/:level?', (req, res) => {
	if (typeof req.params.level !== undefined && req.params.level) {
		write_cmd(CMD_Z2_VOLUME + zero_pad_hex(req.params.level));
		write_cmd('ZVLQSTN'),
		new Promise((resolve) => { emitter.on(CMD_Z2_VOLUME, resolve); }).then(() => res.json(onkyo_status));

	} else {
		res.json(onkyo_status);
	}
});

app.get('/zone2/power/:state?', (req, res) => {
	if (typeof req.params.state !== undefined && req.params.state) {
		if (req.params.state != 'on' && req.params.state != 'off') {
			return;
		}
		write_cmd(CMD_Z2_POWER + (req.params.state == 'on' ? '01' : '00'));
		write_cmd('ZPWQSTN');
		new Promise((resolve) => { emitter.on(CMD_Z2_POWER, resolve); }).then(() => res.json(onkyo_status));
	} else {
		res.json(onkyo_status);
	}
});

app.get('/zone2/input/:source?', (req, res) => {
	if (typeof req.params.source !== undefined && req.params.source) {
		var source = sources.getKeyIn(req.params.source);

		if (source !== undefined && source) {
			write_cmd(CMD_Z2_INPUT + source);
			write_cmd('SLZQSTN');
			new Promise((resolve) => { emitter.on(CMD_Z2_INPUT, resolve); }).then(() => res.json(onkyo_status));
		} else {
			res.json({ 'error': 'source ' + req.params.source + ' not found.' });
		}
	} else {
		res.json(onkyo_status);
	}
});

//
// SERIAL PORT COMMUNICATION
//
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

function write_cmd(cmd) {
	if (port.isOpen()) {
		//console.log("SENDING: " + cmd);
		port.write('!1' + cmd + '\r');
	}
};

function connect() {
	if (!port.isOpen()) {
		port.open();
	}
};

function query_status() {
	write_cmd('PWRQSTN'),
	write_cmd('MVLQSTN'),
	write_cmd('SLIQSTN'),
	write_cmd('ZPWQSTN'),
	write_cmd('ZVLQSTN'),
	write_cmd('SLZQSTN'),
	write_cmd('LMDQSTN')
};

function process_message(message) {
	format_str = /\!1([A-Z]{3})(.{2})?/g;
	match = format_str.exec(message);
	cmd = match[1];
	value = match[2];

	switch (cmd) {
		case CMD_POWER:
			onkyo_status.master.power = (value == '01');
			emitter.emit(CMD_POWER);
			break;
		case CMD_MASTERVOL:
			onkyo_status.master.volume = parseInt('0x' + value);
			emitter.emit(CMD_MASTERVOL);
			break;
		case CMD_INPUT:
			onkyo_status.master.source = sources[value];
			emitter.emit(CMD_INPUT);
			break;
		case CMD_Z2_POWER:
			onkyo_status.zone2.power = (value == '01');
			emitter.emit(CMD_Z2_POWER);
			break;
		case CMD_Z2_VOLUME:
			onkyo_status.zone2.volume = parseInt('0x' + value);
			emitter.emit(CMD_Z2_VOLUME);
			break;
		case CMD_Z2_INPUT:
			onkyo_status.zone2.source = sources[value];
			emitter.emit(CMD_Z2_INPUT);
			break;
		default:
			break;
	}
};

function print_status() {
	console.log(onkyo_status);
};

function receive() {
	return new Promise( (resolve, reject) => {
		port.on('data', (data) => {
			var buffer = Buffer.from(data);
			var message = buffer.toString('utf8');
			//console.log(message);
			process_message(message);
			resolve(port);
		});

		port.on('error', (err) => {
			reject(err);
		});
	});
}

port.on('close', () => {
	setTimeout(connect, 100);
});

port.on('open', (err) => {
	if (err) {
		console.log('error on open ' + err);
	} else {
		query_status();
	}
});

port.on('error', (err) => {
	console.log('error: ', err.message);
	setTimeout(connect, 100);
});

port.on('data', (data) => {
	var buffer = Buffer.from(data);
	var message = buffer.toString('utf8');
	//console.log(message);
	process_message(message);
});

//
// MAIN
//
connect();
app.listen(config.rest_port);

//
// query the status on a regular basis
//
setInterval(query_status, config.refresh_frequency);

//
// KEYPRESS TO QUIT
//
//process.stdin.setRawMode(true);
//process.stdin.resume();
//process.stdin.on('data', process.exit.bind(process, 0));
