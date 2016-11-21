const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const log = require('systemd-journald');
const sqlite3 = require('sqlite3').verbose();

const app = express();

const accounts = {

	getAll: function(req, res) {
		ret = res.locals.retSkel;
		const db_name = crypto.createHash('sha256')
			.update(res.locals.httpBasicAuth[0])
			.digest('hex') + '.db';
		db_file = res.locals.db_folder + db_name;
		const dbExists = fs.existsSync(db_file);
		if (!dbExists) {
			ret.meta.success = false;
			ret.meta.err = "No database for you";
			res.json(ret);
			return;
		}
		const db = new sqlite3.Database(db_file);
		ret.data = [];
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.each("SELECT * FROM Otp", function(err, row) {
				// TOFIX
				console.log(JSON.parse(JSON.stringify(row)));
				ret.data.push(JSON.parse(JSON.stringify(row)));
			});
		});
		ret.meta.success = true;
		console.log(ret.data);
		res.json(ret);
	},

	getOne: function(req, res) {
		//const id = res.params.id;
		//const account = data[0]; //Spoof a DB call
		//res.json(account);
	},

	getToken: function(req, res) {
		ret = res.locals.retSkel;
		ret.meta.success = true;
		ret.data.token = "123456";
		res.json(ret);
	},

	verifyToken: function(req, res) {
	},

	keyUri: function(req, res) {
	},

	create: function(req, res) {
		ret = res.locals.retSkel;
		req.checkBody("issuer", "Must be non-empty").notEmpty();
		req.checkBody("name", "Must be non-empty").notEmpty();
		req.checkBody("otpType", "Must be 'hotp' or 'totp'").notIn(['hotp', 'totp']);
		req.checkBody("secret", "Must be non-empty").notEmpty();
		req.checkBody("fromBase32", "Must be a boolean").isBoolean();
		req.checkBody("tokenLength", "Must be an integer between 6 and 8").isInt().inRange(6, 8);
		req.checkBody("hashName", "Must be 'sha1', 'sha256' or 'sha512'").notIn(['sha1', 'sha256', 'sha512']);
		req.checkBody("timeOffset", "Must be a positive integer").isInt().gte(0);
		req.checkBody("counter", "Must be a positive integer").isInt().gte(0);
		let errors = req.validationErrors();
		if (errors) {
			ret.meta.success = false;
			ret.meta.err = errors;
			res.json(ret);
			return;
		}
		const db_name = crypto.createHash('sha256')
			.update(res.locals.httpBasicAuth[0])
			.digest('hex') + '.db';
		db_file = res.locals.db_folder + db_name;
		console.log(db_file);
		const dbExists = fs.existsSync(db_file);
		const db = new sqlite3.Database(db_file);
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			if (!dbExists) {
				db.run(fs.readFileSync(res.locals.db_folder + 'newAccount.sql', 'utf8'));
			}
			let request = db.prepare(fs.readFileSync(res.locals.db_folder + 'insertAccount.sql', 'utf8'));
			request.run(req.body.issuer, req.body.name, req.body.otpType, req.body.secret,
				req.body.fromBase32, req.body.tokenLength, req.body.hashName,
				req.body.timeOffset, req.body.counter);
			request.finalize();
		});
		ret.meta.success = true;
		// TOFIX set lastRowId as id
		ret.data.id = 42;
		res.json(ret);
	},

	update: function(req, res) {
		//const updateAccount = res.body;
		//const id = req.params.id;
		//data[id] = updateProduct; // Spoof a DB call
		//res.json(updateAccount);
	},

	delete: function(req, res) {
		//const id = req.params.id;
		//data.splice(id - 1, 1) //Spoof a DB call
		//res.json(true);
	}
};

module.exports = accounts;