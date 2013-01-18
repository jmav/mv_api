//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
var mysql = require('mysql');
var express = require('express');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var connection = mysql.createConnection(config.mysqlConn);

var baseImageUrl = "/Users/juremav/DEV/MountVacation/skiresorts images/sm/";

var app = express();

var aa;

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
	// var resortsQuery = 'SELECT ID as id, IDCountry as cid, title FROM resorts WHERE visible = "True"';
	var resortsQuery = 'SELECT resorts.ID as id, IDCountry as cid, resorts.title as title, indexes.index as idx '+
	'FROM resorts INNER JOIN indexes ON resorts.ID = indexes.tableID '+
	'WHERE resorts.visible = "True" AND indexes.table = "resorts" GROUP BY resorts.ID';

	connection.query(resortsQuery, function(err, resorts, fields) {
		if (err) throw err;

		//http://stackoverflow.com/questions/7653080/adding-to-an-array-asynchronously-in-node-js
		async.forEach(resorts, function (resort, callback){
			//console.log(resort); // print the key

			var resortIndexQuery = 'CALL resort_index('+resort.id+')';
			connection.query(resortIndexQuery, function(err, rows, fields) {
				if (err) throw err;

				rows[0].forEach(function(val, idx) {
					if(val.val === 'True') {
						resort[val.field] = true;
					} else if(val.field === 'family' || val.field === 's_park' || val.field === 'seg' || val.field === 'other'){
						if(val.val !== null) {
							var numArr = val.val.split(',');
							for(var i in numArr) { numArr[i] = parseInt(numArr[i], 10);}
							resort[val.field] = numArr;
						} else {
							resort[val.field] = [];
						}
					}else if (val.field === 'img'){

						var strToArr = eval(val.val)[0] || '';
						fs.exists(baseImageUrl + "resort_"+resort.id+"_1_sm.jpg", function(exists) { //check for maps
							if (exists) {
								resort[val.field] = 'map';
							} else {
								resort[val.field] = strToArr || 'no-image';
								// resort[val.field] = _.first(strToArr.match(/[\d]+$/)) || 'no-image'; //just image id
							}
						});

					} else {
						var valN = val.val.replace(',', '.');
						if(isNaN(valN)){
							resort[val.field] = valN;
						} else {
							resort[val.field] = parseFloat(valN, 10);
						}
					}

				});
				callback(); // tell async that the iterator has completed

			});

		}, function(err) {
			//console.log(resorts);
			outJS(res, resorts, 'MV.country.data.resorts');
			// outJSON(res, resorts, 'MV.country.data.resorts');
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
//sends to express
function outJS (res, data, varName) {
	var js = varName + '=' +  JSON.stringify(data);
	res.contentType('application/text');
	res.send(js);
}

//start app
app.listen(3001);
console.log('Listening on port 3001');
console.log('demo at: http://localhost:3001/resortsIndex');
console.log("BE aware: images are checked at: " + baseImageUrl);
//getResortsIndex();

//END -> ctrl + c exit event
process.on( 'SIGINT', function() {
	connection.end(); //end conn. to db
	console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" );
	process.exit();
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
