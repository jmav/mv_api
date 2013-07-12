//generate sitemap.xml from active DB & copy it to server
var config = require('./config');
hbs = require('hbs'),
sm = require('./sitemapgen.js'),
Q = require('q'),
express = require('express'),
moment = require('moment'),
mysql = require('mysql'),
_ = require('underscore'),
pd = require('pretty-data').pd,
fs = require('fs'),
crypto = require('crypto'),
portscanner = require('portscanner'),
log4js = require('log4js');

//dev modules
var inspect = require('eyes').inspector();

// init

moment.lang('en-gb');

var logger = log4js.getLogger(),
dbConLocal = mysql.createConnection(config.mysqlConn_local),
dbConProd1 = mysql.createConnection(config.mysqlConn_1),
connectionState = false;

// dbConProd1 = dbConLocal; //set to local

//app
var app = express();




// error handling
// ECONNRESET error
// dbConProd1.on('close', function (err) {
// 	logger.error('mysqldb conn close');
// 	connectionState = false;
// });

// dbConProd1.on('error', function (err) {
// 	logger.error('mysqldb error: ' + err);
// 	connectionState = false;
// });



function attemptConnection(connection) {

	if(!connectionState){
		connection = mysql.createConnection(connection.config);

		connection.connect(function (err) {
			// connected! (unless `err` is set)
			if (err) {
				logger.error('mysql db unable to connect: ' + err);
				connectionState = false;
			} else {
				logger.info('mysql connect!');
				connectionState = true;
			}
		});

		connection.on('close', function (err) {
			logger.error('mysqldb conn close');
			connectionState = false;
		});

		connection.on('error', function (err) {
			logger.error('mysqldb error: ' + err);
			if (!err.fatal) {
				//throw err;
			}

			if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
				//throw err;
			} else {
				connectionState = false;
				attemptConnection(dbConProd1);
			}
		});
	}
};

attemptConnection(dbConProd1);



var MV = {
	serverPort: 3005,
	mainInit: function(){
		app.listen(this.serverPort);
		console.log('Listening on port $', this.serverPort);
		console.log('demo at: http://localhost:3005/cache-update');
	},
	authenticated: false,
	// validates user
	verifyUserInDB: function(user, pass, callback){
		if(MV.authenticated) return callback(null, MV.authenticated);
		if(user && pass){
			console.log('DB login check');
			var passHash = crypto.createHash('md5').update(pass).digest("hex").toUpperCase();

			var queryStr = 	'SELECT pass '+
							'FROM administrators '+
							'WHERE user = "' + user + '"';

			dbConProd1.query(queryStr, function(err, rows, fields) {
				if(err) console.error(err);
				if(rows.length){
					if(rows[0].pass === passHash) {
						MV.authenticated = true;
						return callback(null, MV.authenticated)
					}
				}
				return callback(null, MV.authenticated);
			});
		} else {
			return callback(new Error('Username & pass must be defined'), false);
		}
	},
	// get all resorts list
	getUrls: function(lang) {
		lang = lang || 'en';
		var deferred = Q.defer();

		var queryStr = 	'SELECT url, lang, IDCountry, IDResort '+
						'FROM index_urls '+
						'WHERE index_urls.lang NOT IN ("hu", "sp", "ru") '+
						'AND index_urls.IDFacility = "" '+
						'AND index_urls.IDAccommodation = "" '+
						'GROUP BY index_urls.url '+
						'ORDER BY IDResort ';

		dbConProd1.query(queryStr, function(err, rows, fields) {
			if(err) deferred.reject(err);
			// rows.unshift({url:'/'+lang+'/', priority: 1, freq: 'daily'}); //append domain root
			deferred.resolve(rows, fields);
		});

		return deferred.promise;
	},
	getDBStatus: function(lang) {
		lang = lang || 'en';
		var deferred = Q.defer();

		var queryStr = 	'SHOW TABLE STATUS FROM gogoski_com_1'; //LIKE "index_urls"';


		dbConProd1.query(queryStr, function(err, rows, fields) {
			if(err) deferred.reject(err);
			// rows.unshift({url:'/'+lang+'/', priority: 1, freq: 'daily'}); //append domain root
			deferred.resolve(rows, fields);
		});

		return deferred.promise;
	},
	urlSearch: function(url, lang, type ) {
		lang = lang || 'en';
		var deferred = Q.defer();

		var queryStr =	' SELECT *'+
						' FROM index_urls'+
						' WHERE lang IN (?)'+
						' AND IDFacility = 0'+
						' AND index_urls.url LIKE ?';

		dbConProd1.query(queryStr, [lang, url], function(err, rows, fields) {
			if(err) deferred.reject(err);
			// rows.unshift({url:'/'+lang+'/', priority: 1, freq: 'daily'}); //append domain root
			deferred.resolve(rows, fields);
		});

		return deferred.promise;
	},
	getIndex: function(req, res){
		MV.getUrls()
			.then(
				function(rows){
				var groupedUrls = _.toArray(_.groupBy(rows, function(url){
						return url.IDResort;
					}));

					var data = { urls: groupedUrls };

					res.render('index-cache.hbs', data);
				},
				function(err){logger.error(err);}
			);

	},
	getStatus: function(req, res){

		MV.getDBStatus()
			.then(
				function(rows){

					var aa  = _.groupBy(rows, function(el){
						// console.log(rows);
						return true;
					});
					// console.log(aa);
					var data = { lastScreenUpdate: moment().format('LLLL') };
					res.render('status.hbs', data);

				},
				function(err){logger.error(err);}
			);
	},
	getSearch: function(req, res){
		var q = req.body;

		MV.urlSearch('%'+q.search+'%', q.lang, q.type)
			.then(
				function(rows){
					var data = {result: rows};
					// data = [1,2,3]
					res.render('search.hbs', data);

				},
				function(err){logger.error(err);}
			);


	}
};

// Asynchronous Auth Function
var auth = express.basicAuth(MV.verifyUserInDB);
var authLogout = express.basicAuth(function(user, pass, callback){
	MV.authenticated = false;
	return callback(null, false);
});


//Web index
app.configure(function(){
	app.use(express.cookieParser());
	app.use(express.cookieParser({secret: '1234567890QWERTY'}));
	app.use(express.cookieSession({secret: '1234567890QWERTY'}));
	// app.use(MV.auth); //auth for all
	app.set('view engine', 'hbs');
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));
	app.set('views', __dirname + '/views');
});

//routes
app.get('/', auth, MV.getIndex); //requires auth
app.get('/status', auth, MV.getStatus); //requires auth
app.all('/search', MV.getSearch);
app.get('/logout', authLogout);

var countries = ['', 'si', 'hr', 'it', 'de', 'fr', 'pl', 'cz', 'en'];

portscanner.checkPortStatus(MV.serverPort, 'localhost', function(error, status) {
	// Status is 'open' if currently in use or 'closed' if available
	if(status === 'closed'){
		MV.mainInit();
	} else {
		console.error('Port '+MV.serverPort+' is in use, closing application.');
	}

});