const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const log = require('systemd-journald');
const sqlite3 = require('sqlite3').verbose();
const myotp = require('myotp');

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
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.all("SELECT * FROM Otp", function(err, row) {
				ret.data = row;
				ret.meta.success = true;
				res.json(ret);
			});
		});
		db.close();
	},

	getOne: function(req, res) {
		ret = res.locals.retSkel;
		req.checkParams("id", "Must be a positive int").isInt().gte(0);
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
		const dbExists = fs.existsSync(db_file);
		if (!dbExists) {
			ret.meta.success = false;
			ret.meta.err = "No database for you";
			res.json(ret);
			return;
		}
		const db = new sqlite3.Database(db_file);
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.get("SELECT * FROM Otp WHERE id=" + req.params.id, function(err, row) {
				ret.data = row;
				ret.meta.success = !!row;
				res.json(ret);
			});
		});
		db.close();
	},

	verifyToken: function(req, res) {
		ret = res.locals.retSkel;
		req.checkBody("token", "Must be non-empty with len between 6 and 8").notEmpty().len(6, 8);
		req.checkParams("id", "Must be a positive int").isInt().gte(0);
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
		const dbExists = fs.existsSync(db_file);
		if (!dbExists) {
			ret.meta.success = false;
			ret.meta.err = "No database for you";
			res.json(ret);
			return;
		}
		const db = new sqlite3.Database(db_file);
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.get("SELECT * FROM Otp WHERE id=" + req.params.id, function(err, row) {
				ret.meta.success = !!row;
				if (!ret.meta.success) {
					ret.meta.success = false;
					ret.meta.err = "No ID " + req.params.id + " in DB";
					res.json(ret);
					return;
				}
				let otpRet = row.otpType == "hotp"
					? myotp.hotp.verify(row.secret, req.body.token, 10, row)
					: myotp.totp.verify(row.secret, req.body.token, 10, row);
				if (!otpRet) {
					ret.meta.success = false;
					ret.meta.err = "Invalid token";
					res.json(ret);
					return;
				}
				if (ret.meta.success && row.otpType == "hotp" && otpRet.delta == 0) {
					db.get("SELECT counter FROM Otp WHERE id=" + req.params.id, function(err, now) {
						db.run("UPDATE Otp SET counter = " + (row.counter + 1) + " WHERE id = " + req.params.id);
						db.close();
					});
				}
				ret.data = otpRet;
				res.json(ret);
			});
		});
	},

	keyUri: function(req, res) {
		ret = res.locals.retSkel;
		req.checkParams("id", "Must be a positive int").isInt().gte(0);
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
		const dbExists = fs.existsSync(db_file);
		if (!dbExists) {
			ret.meta.success = false;
			ret.meta.err = "No database for you";
			res.json(ret);
			return;
		}
		const db = new sqlite3.Database(db_file);
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.get("SELECT * FROM Otp WHERE id=" + req.params.id, function(err, row) {
				ret.meta.success = !!row;
				if (ret.meta.success) {
					ret.data.keyUri = row.otpType == "hotp"
					? myotp.hotp.generateKeyUri(row.secret, row)
					: myotp.totp.generateKeyUri(row.secret, row);

				}
				res.json(ret);
			});
		});
		db.close();
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
			db.get("SELECT last_insert_rowid() as id", function(err, row) {
				ret.data.id = row.id;
				ret.meta.success = true;
				res.json(ret);
			});
		});
		db.close();
	},

	delete: function(req, res) {
		ret = res.locals.retSkel;
		req.checkParams("id", "Must be a positive int").isInt().gte(0);
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
		const dbExists = fs.existsSync(db_file);
		if (!dbExists) {
			ret.meta.success = false;
			ret.meta.err = "No database for you";
			res.json(ret);
			return;
		}
		const db = new sqlite3.Database(db_file);
		db.serialize(function() {
			db.run('PRAGMA key=' + res.locals.httpBasicAuth[1]);
			db.run("DELETE FROM Otp WHERE id=" + req.params.id);
			ret.meta.success = true;
			res.json(ret);
		});
		db.close();
	}
};

module.exports = accounts;
