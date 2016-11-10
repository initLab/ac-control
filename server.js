'use strict';

const fs = require('fs');

const http = require('http');
const dispatcher = require('httpdispatcher');
const URL = require('url');
const QS = require('querystring');

const SSH = require('simple-ssh');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

let status;

status = {
	on: false,
	mode: 0,
	temp: 0,
	fan: 0
};

function leadingZero(num) {
	if (num > 9) {
		return num;
	}
	
	return '0' + num;
}

function logger(line) {
	let dt = new Date;
	let args = [line];
	args.unshift(
		'[' +
		leadingZero(dt.getDate()) + '.' +
		leadingZero(dt.getMonth()) + '.' +
		(1900 + dt.getYear()) + ' ' +
		leadingZero(dt.getHours()) + ':' +
		leadingZero(dt.getMinutes()) + ':' +
		leadingZero(dt.getSeconds()) +
		']'
	);
	console.log.apply(console, args);
}

function parseArgs(query) {
	if (!('password' in query)) {
		return false;
	}
	
	if (query.password !== config.listen.password) {
		return false;
	}
	
	if (!('on' in query)) {
		return false;
	}
		
	let args = [
		'2',  // model = midea
		'1',  // on/off = on
		'2',  // mode = auto
		'24', // temp
		'11'  // fan = auto
	];
	
	if (!query.on) {
		args[1] = '0';
		return args;
	}
	
	if (!('mode' in query && 'temp' in query && 'fan' in query)) {
		return false;
	}
	
	let mode;
	
	switch (query.mode) {
		case 'cool':
			mode = 0;
			break;
		case 'dry':
			mode = 1;
			break;
		case 'auto':
			mode = 2;
			break;
		case 'heat':
			mode = 3;
			break;
		default:
			return false;
	}
	
	let temp = parseInt(query.temp);
	
	if (temp < 17 || temp > 30) {
		return false;
	}
	
	if (mode === 1) {
		temp = 28;
	}
	
	let fan;
	
	switch (query.fan) {
		case 'high':
			fan = 3;
			break;
		case 'low':
			fan = 9;
			break;
		case 'auto':
			fan = 11;
			break;
		default:
			return false;
	}
	
	args[2] = mode;
	args[3] = temp;
	args[4] = fan;
	
	return args;
}

dispatcher.onGet('/status', function(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
    });

	res.end(JSON.stringify(status));
});

dispatcher.onGet('/config', function(req, res) {
	let url = URL.parse(req.url);
	let query = QS.parse(url.query);
	
	let args = parseArgs(query);
	
	if (args === false) {
		res.writeHead(400, {
			'Content-Type': 'application/json'
		});
		
		res.end(JSON.stringify({
			'error': 'Invalid parameters'
		}));
		
		return;
	}
	
	let ssh = new SSH(config.ssh);
	
	ssh.exec('/home/pi/ir_tx/ir_tx', {
		args: args,
		exit: function(code, stdout, stderr) {
			let resCode = 200;
			
			let response = {
				'code': code,
				'stdout': stdout,
				'stderr': stderr
			};
			
			if (code !== 0) {
				resCode = 500;
				response.error = 'Server error';
			}
			
			res.writeHead(resCode, {
				'Content-Type': 'application/json'
			});
			
			res.end(JSON.stringify(response));
		}
	}).start();
});

http.createServer(function(req, res) {
	let conn = req.connection;
	
	logger('HTTP client connected: ' + conn.remoteAddress + ':' + conn.remotePort);
	logger(req.method + ' ' + req.url);
	
	try {
		dispatcher.dispatch(req, res);
	}
	catch(err) {
		logger(err);
	}
}).listen(config.listen.port, function() {
	logger('Server listening on: http://0.0.0.0:' + config.listen.port);
});
