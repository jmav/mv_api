//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
codelists = require('./codelists'),

express = require('express'),
// connectDomain = require("connect-domain"),
domain = require('domain').create(),
mysql = require('mysql'),
async = require('async'),
_ = require('underscore'),
fs = require('fs'),
hbs = require('hbs'),
inspect = require('eyes').inspector(),
moment = require('moment');

// inspect = require('eyes').inspector({styles: {all: 'magenta'}}),
// Iconv  = require('iconv').Iconv,
// iconv = new Iconv('UTF-8', 'CP1250'), //convert  OR  // iconv = new Iconv('UTF-8', 'CP1250//TRANSLIT//IGNORE'),


var startTimer,
app = express(),
dbConLocal = mysql.createConnection(config.mysqlConn_local),
dbConProd1 = mysql.createConnection(config.mysqlConn_1);

//##### ENVIRONMENT VARIABLES
var USELOCALDB = true;




//##### ERROR HANDLING
// domain.on("error", function(err) {
// 	console.log("error:" + err.message);
// });

// domain.run(function(){
// 	a + b;
// });

// app.use(connectDomain()).use(function(err, req, res, next) {
// 	res.writeHeader(500, {'Content-Type' : "text/html"});
// 	res.write("<h1>" + err.name + "</h1>");
// 	next();
// 	res.end("<p style='border:1px dotted red'>" + err.message + "</p>");
// });



if (USELOCALDB) dbConProd1 = dbConLocal;



app.use(function(req, res, next) {
	domain.on("error", function(err) {
		console.log("error:" + err.message);
		res.writeHeader(500, {'Content-Type' : "text/html"});
		res.write("<h1>" + err.name + "</h1>");
		res.end("<p style='border:1px dotted red'>" + err.message + "</p>");

	});
	domain.enter();
	next();
});

// var d = domain.create();
// d.on('error', function(er) {
// 	console.error('Caught error!', er);
// });
// d.run(function() {
// 	process.nextTick(function() {
// 	setTimeout(function() { // simulating some various async stuff
// 		fs.open('non-existent file', 'r', function(er, fd) {
// 			if (er) throw er;
// 		// proceed...
// 		});
// 	}, 100);
// 	});
// });


// varr();

//#####

app.configure(function(){
	app.set('view engine', 'hbs');
	app.use(express.static('public'));
	app.use(express.bodyParser());
	// app.engine('.html', require('handlebars'));
	// app.set('view engine', 'handlebars');
	// app.set('views', __dirname + '/views');
	// app.set("view options", { layout: false });

	// app.register('.hbs', require('handlebars'));
 //    app.set('views',__dirname + '/views');
 //    app.set('view engine', 'hbs');
});


var headerTmpl = '<div><a href="/">Home</a></div>';

var serverDest = _.keys(config.pathMap);

var MV = { //Mountvacation workspace
	date: {
		next: function(day) { //0-6 sunday - shows upcomming days
			var plusWeek = (moment().day() >= day) ? 7 : 0;
			return moment().day(plusWeek + day).format();
		}
	},
	api: { //api routines

		getForecast: function(req, res) {
			//Countries - group by lang
			var action = req.params.action;

			var queryStr = 'SELECT IDResort, date, summit_cond FROM myweather_dnevni_napoved;';
			dbConProd1.query(queryStr, function(err, rows, fields) {
				if (err) throw err;


				var filteredList = _.chain(rows)
				.filter(function(dts){ var dtsDay = moment(dts.date).day(); return dtsDay === 0 || dtsDay === 6; })
				.groupBy(function(obj){return obj.IDResort;})
				.value();

				_.each(filteredList, function(obj, key){
					var objS = {};
					_.each(obj, function(val,i){
						var sumPerc = codelists.weatherSymbolsPercentage[val.summit_cond];
						if (typeof(sumPerc) === 'undefined'){
							console.log('undefined weather symbol:', val);
							sumPerc = 0;
						}
						var day = 'd' + moment(val.date).day();
						objS[day] = [val.summit_cond, sumPerc];
					});
					filteredList[key] = objS;
				});

				if(action){
					var path = config.pathMap[action] || 'x'; //sym. error
					var idxJs = 'MV.data.forecast=' +  JSON.stringify(filteredList);
					outSftp(res, idxJs, 'data-forecast.js', path);
				} else {
					// outJS(res, filteredList, 'MV.data.info');
					outJSON(res, filteredList, 'MV.data.forecast');
				}
			});
		},
		getResortsIndexNew: function(req, res){

		}

	}
};



bootstrapRoutes();

function bootstrapRoutes() {
	app.all('*', function(req, res, next){
		startTimer = new Date();
		inspect(req.url);
		next();
	});

	app.get('/', getIndex);
	app.get('/countries', getCountries);
	app.get('/countries/:action', getCountries);
	app.get('/resorts', getResorts);
	app.get('/resorts/:action', getResorts);
	app.get('/resortsIndex', getResortsIndex);
	app.get('/resortsIndex/:action', getResortsIndex);
	app.get('/resortsIndexNew', MV.api.getResortsIndexNew);
	app.get('/info', getInfo);
	app.get('/info/:action', getInfo);
	app.get('/forecast', MV.api.getForecast);
	app.get('/forecast/:action', MV.api.getForecast);
}


//Handlebar helpers
hbs.registerHelper('link', function(object) {
	return new hbs.SafeString(
		'<a href="' + object.url + '">' + object.text + '</a>'
		);
});
hbs.registerHelper('select', function(object) {
	var html = '<select id="'+object.id+'" name="'+object.id+'" '+object.attr+'>';
	_.each(object.values, function (item) {
		//var selected = (inputFieldDesc.value() === item) ? 'selected="selected"' : '';
		html += '<option value="' + item.value + '">' + item.text + '</option>';
	});
	html += '</select>';
	return new hbs.SafeString(html);
});
// hbs.registerPartial('partial_name', 'partial value');



//METHODS

function getIndex(req, res){

	var data = {};

	data.routes = _.map(app.routes.get, function(val, key){
		return {url: val.path, text: val.path};
	});

	data.baseRoutes = {id:'baseRoutes',multi:false,attr:'multiple', values: _.filter(_.map(app.routes.get, function(val, key){
		return {"value": val.path, url: val.path, text: val.path};
	}), function(val){
		return (val.value.indexOf('/:') === -1);
	})};

	data.serverList = {id:'serverList',multi:false,attr:'multiple', values: _.map(serverDest, function(val, key){
		return {"value": val, url: val, text: val};
	})};
	// console.log(app.routes.get);

	//build list
	// _.each(app.routes.get, function(val, key){
	// 	data.urlList += '<li><a href="'+val.path+'">'+val.path+'</a></li>';
	// });

	//index html
	// var template = '<h2>List of api URLs</h2>'+headerTmpl+actionTmpl+
	// '<ul>'+urlList+'</ul>';
	// res.send(template);
	res.render('index.hbs', data);
}

function getInfo(req, res) {

	//Countries - group by lang
	var action = req.params.action;

	var queryStr = 'SELECT 88000 + SUM(nights) as nights '+
		'FROM ( '+
		'SELECT '+
		'	booking2_cart.ID, '+
		'	SUM(booking2_cart_content.stay) as nights '+
		'FROM '+
		'	booking2_cart '+
		'LEFT JOIN '+
		'	booking2_cart_content ON booking2_cart_content.IDCart = booking2_cart.ID '+
		'LEFT JOIN '+
		'	booking2_cart_content_persons ON booking2_cart_content_persons.IDContent=booking2_cart_content.ID '+
		'WHERE booking2_cart.status="payment" '+
		'AND booking2_cart.payment_status="completed" '+
		'GROUP BY booking2_cart.ID) as nights_per_booking; ';

	dbConProd1.query(queryStr, function(err, rows, fields) {
		if (err) throw err;

		rows = rows[0];

		if(action){
			var path = config.pathMap[action] || 'x'; //sym. error
			var idxJs = 'MV.data.info=' +  JSON.stringify(rows);
			outSftp(res, idxJs, 'data-info.js', path);
		} else {
			// outJS(res, rows, 'MV.data.info');
			outJSON(res, rows, 'MV.data.countries');
		}
	});
}

function getCountries(req, res) {
	//Countries - group by lang
	var action = req.params.action;

	var queryStr = 'SELECT IDCountry, '+
		'`value` AS title,  '+
		'countries_values.lang, '+
		'`index` '+
		'FROM countries_values INNER JOIN indexes ON countries_values.IDCountry = indexes.tableID AND countries_values.lang = indexes.lang '+
		'WHERE countries_values.field = "title" '+
		'AND IDCountry NOT IN (23, 21, 28, 22)  '+
		'GROUP BY countries_values.ID '+
		'ORDER BY `value` ';

	dbConProd1.query(queryStr, function(err, rows, fields) {
		if (err) throw err;

		var countryGroup = _.groupBy(rows, function(val){ return val.IDCountry; });

		_.each(countryGroup, function(obj, key, list){
			var nObj = {};
			_.each(obj, function(val, key) {
				nObj[val.lang] = [val.title || '', val.index];
			});
			list[key] = nObj;
		});

		if(action){
			var path = config.pathMap[action] || 'x'; //sym. error
			var idxJs = 'MV.data.countries=' +  JSON.stringify(countryGroup);
			//console.log(idxJs, 'data-countries.js', path);
			outSftp(res, idxJs, 'data-countries.js', path);
		} else {
			// outJS(res, countryGroup, 'MV.data.countries');
			outJSON(res, countryGroup, 'MV.data.countries');
		}
	});
}

function getResorts(req, res){
	//Resorts - group by country
	var action = req.params.action;

	var queryStr = 'SELECT '+
						'IDCountry, '+
						'resorts.ID, '+
						'resorts.title, '+
						'`index` '+
					'FROM countries INNER JOIN resorts ON countries.ID = resorts.IDCountry '+
					'	INNER JOIN indexes ON resorts.ID = indexes.tableID '+
					'WHERE resorts.visible = TRUE '+
					'AND IDCountry NOT IN (23, 21, 28, 22) '+
					'AND `default` = TRUE '+
					'AND indexes.table = "resorts" '+
					'GROUP BY resorts.ID '+
					'ORDER BY title ';

	dbConProd1.query(queryStr, function(err, rows, fields) {
		if (err) throw err;

		// countryGroup = _.groupBy(rows, function(val){ return val.IDCountry; });

		// _.each(countryGroup, function(obj, key, list){
		// 	var nObj = [];
		// 	_.each(obj, function(val, key) {console.log(key, val);
		// 		nObj.push([val.title || '', val.ID, val.index]);
		// 	});
		// 	list[key] = nObj;
		// });

		countryGroup = _.map(rows, function(val){
			return [val.title, val.ID, val.index, val.IDCountry];
		});

		if(action){
			var path = config.pathMap[action] || 'x'; //sym. error
			var idxJs = 'MV.data.resorts=' +  JSON.stringify(countryGroup);
			//console.log(idxJs, 'data-resorts.js', path);
			outSftp(res, idxJs, 'data-resorts.js', path);
		} else {
			//outJS(res, countryGroup, 'MV.data.resorts');
			outJSON(res, countryGroup, 'MV.data.countries');
		}

		// countryList = _.pluck(rows, 'IDCountry');
		// countryList = _.union(countryList);

	});
}

function getResortsIndex(req, res){
	//JSON for country index page

	//dbConLocal.connect();

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
			//
			resorts = _.sortBy(resorts, function(obj){
				return obj.title;
			});
			if(action){
				var path = config.pathMap[action] || 'x'; //sym. error
				var idxJs = 'MV.country.data.resorts=' +  JSON.stringify(resorts);
				outSftp(res, idxJs, 'resorts-index.js', path);
			} else {
				// outJS(res, resorts, 'MV.country.data.resorts');
				outJSON(res, resorts, 'MV.country.data.resorts');
			}
		});

	});
}

function printTime(){
	console.log('it took: ' + ((new Date() - startTimer)/1000) + ' s from req startTimer');
}

//sends to SFTP
function outSftp (res, data, file, path) {
	var sftp = require('node-sftp');
	// var dataCp = iconv.convert(data);
	var dataCp = data;
	config.sftp_1.home = path;
	printTime();

	sftp = new sftp(
		config.sftp_1,
		function(err) {
			//Error
			if (err) throw err;

			//Success
			console.log("Connected to SFTP");

			//Write sample file
			sftp.writeFile(file, dataCp, "ascii", function(err) {
				if (err) throw err;
				var msg = "It's saved as: "+path+'/'+file + ' (' + (dataCp.length/1024).toFixed(2) + ' kB)';
				printTime();
				console.log(msg);
				res.send(msg);
			});
		}
	);
}

//sends to express
function outJSON (res, data) {
	var json = JSON.stringify(data);
	printTime();
	res.contentType('application/json');
	res.send(json);
}

//sends to express
function outJS (res, data, varName) {
	var js = varName + '=' +  JSON.stringify(data);
	printTime();
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
	dbConProd1.end(); //end conn. to db
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
