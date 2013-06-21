//libraries
var Q = require('q'),
fs = require('fs'),
log4js = require('log4js'),
_ = require('underscore');


//settings
var startTimer;
var dbConn = {
	host     : 'localhost',
	user     : 'root',
	password : 'root',
	// debug    : true,
	database : 'aa',
	connectionLimit: 10
};

mvDb = require('./dbsrc').dbSrc(dbConn);
//init
log4js.configure({
	appenders: [ { type: "console" }],
	replaceConsole: true
});

var logger = log4js.getLogger();


// connection.on('error', function() {}); //common error event



//app

//error handling
var pErr = function(err){
	console.error('err', err);
};






var aa = new dbSrc(dbConn);





	startTimer = new Date();

	// console.log('q1', new Date() - startTimer);

	// _.each(_.range(1,21), function(i){
	// 	MySqlDemo.prototype.queryDb('select sleep('+1+')')
	// 		.then(
	// 			function(rows){
	// 				console.log('done q'+i, new Date() - startTimer);
	// 				// console.log(rows);

	// 			}, pErr
	// 		);
	// })


var a = function(){
	console.log('aa');
	_.each(_.range(1,21), function(i){
		// aa.queryDb('select sleep('+0.01+')')
		aa.queryDb('SELECT lid from locales_source')
			.then(
				function(rows, fields){
					console.log('done q'+i, new Date() - startTimer);
					// console.log(rows);

				}, pErr
			);
	})


}

//start
// a()


