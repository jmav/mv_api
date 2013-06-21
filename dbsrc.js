// MYSQL connection over Q promise
// Author: Jure Mav
// Date: 2013-05-17

//libraries
var Q = require('q'),
mysql = require('mysql');

// Define our initial class.
var dbSrc = function(conn) {
	console.log('aa', conn);
	this.initialize(conn);
};

// Initialize: Starts all the fun.
dbSrc.prototype.initialize = function(conn) {
	console.log('initialize');

	// Q.all([this.connectDb(conn), this.startServer()]).spread(this.ready, this.fail);
	this.connectDb(conn).then(this.ready);
};

// Start DB: Initialize DB Connection.
dbSrc.prototype.connectDb = function(conn) {
	console.log('connect to DB');

	var deferred = Q.defer();

	this.pool = mysql.createPool(conn);
	deferred.resolve('this.pool');
	return deferred.promise;
};

//for pool of connections
dbSrc.prototype.getPoolDb = function() {
	console.log('get conn from pool');
	var deferred = Q.defer();

	this.pool.getConnection(function(err, connection) {
		// if(err)	console.log('err', err);
		if(err)	deferred.reject(err);
		deferred.resolve(connection);
	});

	// connection.end();
	return deferred.promise;
};

dbSrc.prototype.queryDb = function(queryDB) {
	var deferred = Q.defer();

	this.getPoolDb()
		.then(function(connection) {
			console.log('queryDb');

			connection.query(queryDB, function(err, rows, fields) {
				if(err) deferred.reject(err);
				connection.end();

				deferred.resolve(rows, fields);
			});
		});
	return deferred.promise;
};

// In case of emergency... RUN IN CIRCLES!
dbSrc.prototype.fail = function(err) {
	console.log('fail', err);
};

// Ready: Once bot asynchronous dependencies are ready (MySQL and HTTP)
// do something useful with them.
dbSrc.prototype.ready = function(db, server) {
	console.log('mysql connection established & pool ready');
};

exports.dbSrc = dbSrc(conn);