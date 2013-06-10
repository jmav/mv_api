//generate sitemap.xml from active DB & copy it to server
var config = require('./config');
hbs = require('hbs'),
sm = require('./sitemapgen.js'),
Q = require('q'),
express = require('express'),
mysql = require('mysql'),
_ = require('underscore'),
pd = require('pretty-data').pd,
fs = require('fs'),
log4js = require('log4js');

//dev modules
var inspect = require('eyes').inspector();

// init
var logger = log4js.getLogger(),
dbConLocal = mysql.createConnection(config.mysqlConn_local),
dbConProd1 = mysql.createConnection(config.mysqlConn_1);

//app
var app = express();

//Web index
app.configure(function(){
	app.set('view engine', 'hbs');
	app.use(express.static('public'));
	app.use(express.bodyParser());
});

//routes
app.get('/', getIndex);

// get all resorts list
var getUrls = function(lang) {
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
};

var countries = ['', 'si', 'hr', 'it', 'de', 'fr', 'pl', 'cz', 'en'];

function getIndex(req, res){

	getUrls()
		.then(
			function(rows){
			var groupedUrls = _.toArray(_.groupBy(rows, function(url){
					// console.log(num, num.url.substring(1,3));

					return url.IDResort;
				}));

				var data = { urls: groupedUrls };

				res.render('index-cache.hbs', data);

			},
			function(err){logger.error(err);}
		);

}


app.listen(3005);
console.log('Listening on port 3005');
console.log('demo at: http://localhost:3005/cache-update');