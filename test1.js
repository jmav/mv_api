//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
var mysql = require('mysql');
var express = require('express');
var connection = mysql.createConnection(config.mysqlConn);

var app = express();

// get_countries();
app.get('/countries', function(req, res) {
	get_countries(res, function(rows){
		res.contentType('application/json');
		res.end(rows);
	});
});


//METHODS

function get_countries(res, clbk) {
//db connect
	connection.connect();
	connection.query('SELECT countries.title FROM countries;', function(err, rows, fields) {
		if (err) throw err;
		connection.end();
		clbk(JSON.stringify(rows));
	});
}

//sends to express
function outJSON (data) {
	var json = JSON.stringify(data);
	return (json);
}



//start app
app.listen(3000);
console.log('Listening on port 3000');



//SAMPLES
//http://www.hawkee.com/snippet/9487/

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