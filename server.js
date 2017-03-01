'use strict';

const fs = require('fs');

const http = require('http');
const HttpDispatcher = require('httpdispatcher');
const dispatcher = new HttpDispatcher;
const URL = require('url');
const QS = require('querystring');

const SSH = require('simple-ssh');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

let status = fs.existsSync(config.statusFile) ?
	JSON.parse(fs.readFileSync(config.statusFile)) :
	config.ac.defaultStatus;

function leadingZero(num) {
	if (num > 9) {
		return num;
	}
	
	return '0' + num;
}

function logger(line) {
	const dt = new Date;
	const args = [line];
	
	args.unshift(
		'[' +
		leadingZero(dt.getDate()) + '.' +
		leadingZero(dt.getMonth()) + '.' +
		(dt.getFullYear()) + ' ' +
		leadingZero(dt.getHours()) + ':' +
		leadingZero(dt.getMinutes()) + ':' +
		leadingZero(dt.getSeconds()) +
		']'
	);
	
	console.log.apply(console, args);
}

function parseArgs(query) {
	if (!('password' in query && query.password === config.listen.password)) {
		return false;
	}
	
	if ('on' in query) {
		status.on = (parseInt(query.on) === 1);
	}
	
	if ('mode' in query) {
		status.mode = parseInt(query.mode);
	}
	
	if ('temp' in query) {
		status.temp = parseInt(query.temp);
	}
	
	if ('fan' in query) {
		status.fan = parseInt(query.fan);
	}
	
	fs.writeFileSync(config.statusFile, JSON.stringify(status));
	
	return true;
}

function buildArgs() {
	return [
		String(config.ac.model),
		String(status.on ? 1 : 0),
		String(status.mode),
		String(status.temp),
		String(status.fan)
	];
}

dispatcher.setStatic('/ui/');
dispatcher.setStaticDirname('static');

dispatcher.onGet('/status', function(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
    });

	res.end(JSON.stringify(status));
});

dispatcher.onPost('/config', function(req, res) {
	logger(req.params);
	
	if (!parseArgs(req.params)) {
		res.writeHead(400, {
			'Content-Type': 'application/json'
		});
		
		res.end(JSON.stringify({
			error: 'Invalid parameters',
			status: status
		}));
		
		return;
	}
	
	const ssh = new SSH(config.ssh.connection);
	const args = buildArgs();
	
	logger(args);

	ssh.exec(config.ssh.command, {
		args: args,
		exit: function(code, stdout, stderr) {
			let resCode = 200;
			
			const response = {
				code: code,
				stdout: stdout,
				stderr: stderr,
				status: status
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
	const conn = req.connection;
	
	logger('HTTP client connected: ' + conn.remoteAddress + ':' + conn.remotePort);
	logger(req.method + ' ' + req.url);
	
	try {
		dispatcher.dispatch(req, res);
	}
	catch(err) {
		logger(err);
	}
}).listen(config.listen.port, config.listen.hostname, function() {
	logger('Server listening on: http://' + config.listen.hostname + ':' + config.listen.port);
});
