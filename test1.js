//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
var mysql = require('mysql');
var express = require('express');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var dbConLocal = mysql.createConnection(config.mysqlConn_local);
var dbConProd1 = mysql.createConnection(config.mysqlConn_1);

var app = express();
var headerTmpl = '<div><a href="/">Home</a></div>';
var actionTmpl =	'<div><a href="/resortsIndex/live">ResortIndex - save to sftp live</a><br /></div>'+
					'<div><a href="/resortsIndex/test">ResortIndex - save to sftp test</a><br /></div>'+
					'<div><a href="/resortsIndex/test1">ResortIndex - save to sftp test1</a><br /></div>';


dbConLocal.connect();
bootstrapRoutes();

function bootstrapRoutes() {
	app.get('/', getIndex);
	app.get('/countries', getCountries);
	app.get('/resorts', getResorts);
	app.get('/resortsIndex', getResortsIndex);
	app.get('/resortsIndex/:action', getResortsIndex);
}
//METHODS

function getIndex(req, res){
	var urlList = '';

	//build list
	_.each(app.routes.get, function(val, key){
		urlList += '<li><a href="'+val.path+'">'+val.path+'</a></li>';
	});

	//index html
	var template = '<h2>List of api URLs</h2>'+headerTmpl+actionTmpl+
	'<ul>'+urlList+'</ul>';
	res.send(template);
}
function getResorts(req, res){
	//Resorts with countries & indexes for FrontPage
	var queryStr = 'SELECT '+
		'	resorts.IDCountry,'+
		'	resorts.ID IDres, '+
		'	resorts.title as resTitle, '+
		'	indexes.index as resIndex '+
		'FROM resorts'+
		'	INNER JOIN countries ON resorts.IDCountry = countries.ID '+
		'	INNER JOIN indexes ON resorts.ID = indexes.tableID '+
		'WHERE countries.active = TRUE '+
		'AND resorts.visible = TRUE '+
		'AND indexes.table = "resorts" '+
		'AND indexes.default = TRUE '+
		'GROUP BY resorts.ID ';

	dbConLocal.query(queryStr, function(err, rows, fields) {
		if (err) throw err;

		countryGroup = _.groupBy(rows, function(val){ return val.IDCountry; });
		_.each(countryGroup, function(val, key){
			// console.log(key, val);
			res.send(val);
		});

		countryList = _.pluck(rows, 'IDCountry');
		countryList = _.union(countryList);

		//outJSON(res, countryList+'aa');
	});
}

function getResortsIndex(req, res){
	//JSON for country index page

	var action = req.params.action;

	//http://www.mysqltutorial.org/stored-procedures-parameters.aspx
	//http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
	// var queryStr = 'SELECT ID as id, IDCountry as cid, title FROM resorts WHERE visible = "True"';
	var queryStr = 'SELECT resorts.ID as id, IDCountry as cid, resorts.title as title, indexes.index as idx '+
	'FROM resorts INNER JOIN indexes ON resorts.ID = indexes.tableID '+
	'WHERE resorts.visible = "True" AND indexes.table = "resorts" GROUP BY resorts.ID';

	dbConProd1.query(queryStr, function(err, resorts, fields) {
		if (err) throw err;

		//http://stackoverflow.com/questions/7653080/adding-to-an-array-asynchronously-in-node-js
		async.forEach(resorts, function (resort, callback){
			//console.log(resort); // print the key

			var resortIndexQuery = 'CALL resort_index('+resort.id+')';
			dbConLocal.query(resortIndexQuery, function(err, rows, fields) {
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
						fs.exists(config.baseImageUrl + "resort_"+resort.id+"_1_sm.jpg", function(exists) { //check for maps
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
			if(action){
				var path = config.pathMap[action] || 'x'; //sym. error

				var idxJs = 'MV.country.data.resorts=' +  JSON.stringify(resorts);
				outSftp(res, idxJs, 'resorts-index.js', path);
			} else {
				outJS(res, resorts, 'MV.country.data.resorts');
				// outJSON(res, resorts, 'MV.country.data.resorts');
			}
		});

	});
}

function getCountries(req, res) {
//db connect
	dbConProd1.query('SELECT * FROM allcountries;', function(err, rows, fields) {
		if (err) throw err;
		outJSON(res, rows);
	});
}

//sends to SFTP
function outSftp (res, data, file, path) {
	var sftp = require('node-sftp');
	var Iconv  = require('iconv').Iconv;

	var iconv = new Iconv('UTF-8', 'CP1250'); //convert
	var dataCp = iconv.convert(data);

	config.sftp_1.home = path;

	sftp = new sftp(
		config.sftp_1,
		function(err) {
			//Error
			if (err) throw err;

			//Success
			console.log("Connected to SFTP");

			//Write sample file
			sftp.writeFile(file, dataCp, "", function(err) {
				if (err) throw err;
				var msg = "It's saved as: "+path+'/'+file + ' (' + (dataCp.length/1024).toFixed(2) + ' kB)';
				console.log(msg);
				res.send(msg);
			});
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
console.log("BE aware: images are checked at: " + config.baseImageUrl);
//getResortsIndex();

//END -> ctrl + c exit event
process.on( 'SIGINT', function() {
	dbConLocal.end(); //end conn. to db
	console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" );
	process.exit();
});

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
// * Every method you invoke on a dbConLocal is queued and executed in sequence.
// * Closing the connection is done using `end()` which makes sure all remaining
//   queries are executed before sending a quit packet to the mysql server.

//MYSQL
//http://stackoverflow.com/questions/2281890/can-i-create-view-with-parameter-in-mysql
