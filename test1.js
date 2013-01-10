//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
var mysql = require('mysql');
var express = require('express');
var async = require('async');
var connection = mysql.createConnection(config.mysqlConn);

var app = express();

	connection.connect();
// get_countries();
app.get('/countries', function(req, res) {
	get_countries(res);
});
app.get('/resortsIndex', function(req, res) {
	getResortsIndex(res);
});


//METHODS

function getResortsIndex(res){
	//http://www.mysqltutorial.org/stored-procedures-parameters.aspx
	//http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
	var resortsQuery = 'SELECT ID as id, IDCountry as c_id, title as name FROM resorts WHERE visible = "True"';
	connection.query(resortsQuery, function(err, resorts, fields) {
		if (err) throw err;

		//http://stackoverflow.com/questions/7653080/adding-to-an-array-asynchronously-in-node-js
		async.forEach(resorts, function (resort, callback){
			//console.log(resort); // print the key

			var resortIndexQuery = 'CALL resort_index('+resort.id+')';
			connection.query(resortIndexQuery, function(err, rows, fields) {
				if (err) throw err;

				rows[0].forEach(function(val) {
					resort[val.field] = val.val;
				});
				callback(); // tell async that the iterator has completed

			});

		}, function(err) {
			//console.log(resorts);
			outJSON(res, resorts);
		});

	});
}

function get_countries(res) {
//db connect
	connection.query('SELECT * FROM allcountries;', function(err, rows, fields) {
		if (err) throw err;
		outJSON(res, rows);
	});
}

//sends to express
function outJSON (res, data) {
	var json = JSON.stringify(data);
	res.contentType('application/json');
	res.send(json);
}



//start app
app.listen(3001);
console.log('Listening on port 3001');
//getResortsIndex();

//END -> ctrl + c exit event
process.on( 'SIGINT', function() {
	connection.end(); //end conn. to db
	console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" )
	process.exit()
})

//SAMPLES
//http://www.hawkee.com/snippet/9487/
//Node.js and Express - Setting Content-Type for all Responses
//http://www.switchonthecode.com/snippet-tutorials/nodejs-and-express-setting-content-type-for-all-responses

// //http://metaduck.com/01-asynchronous-iteration-patterns.html
// function insertCollection(collection, callback) {
// 	for(var i = 0; i < collection.length; i++) {
// 		db.insert(collection[i], function(err) {
// 			if(err) {
// 				throw err;
// 			}
// 		});
// 	}
// 	callback();
// }

// From this example, you can learn the following:
// * Every method you invoke on a connection is queued and executed in sequence.
// * Closing the connection is done using `end()` which makes sure all remaining
//   queries are executed before sending a quit packet to the mysql server.

//MYSQL
//http://stackoverflow.com/questions/2281890/can-i-create-view-with-parameter-in-mysql
