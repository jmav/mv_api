//generate sitemap.xml from active DB & copy it to server
var config = require('./config');
sm = require('./sitemapgen.js'),
Q = require('q'),
// express = require('express'),
mysql = require('mysql'),
_ = require('underscore'),
pd = require('pretty-data').pd,
fs = require('fs'),
sftp = require('sftp'),
log4js = require('log4js');

//dev modules
var inspect = require('eyes').inspector();

// init
var logger = log4js.getLogger(),
dbConLocal = mysql.createConnection(config.mysqlConn_local),
dbConProd1 = mysql.createConnection(config.mysqlConn_1);

//app

//get all


var getCountries = function(lang) {
	var deferred = Q.defer();
	config.sftp_dedi.home = config.pathMap['live_sitemap'] + lang; //set sftp path

	var queryStr = 	'SELECT url , '+
					'CASE  '+
					'    WHEN IDaccommodation > "" THEN 0.8 '+
					'    WHEN IDresort > "" THEN 0.9 '+
					'    WHEN IDcountry > "" THEN 0.7 '+
					'    else 5 '+
					'END as priority '+
					'FROM index_urls '+
					'WHERE index_urls.url LIKE "/'+lang+'/%" '+
					'AND index_urls.IDFacility = "" '+
					'GROUP BY index_urls.url ' +
					'ORDER BY url'

	dbConProd1.query(queryStr, function(err, rows, fields) {
		if(err) deferred.reject(err);
		if(rows[0].url.indexOf('//') != -1){ //bug fix, some (hr, sp ...) domains have root
			rows.splice(0, 0);
		}
		rows.unshift({url:'/'+lang+'/', priority: 1, freq: 'daily'}); //append domain root
		deferred.resolve(rows, fields);
	});

	return deferred.promise;
};


// getCountries('si');
// getCountries('hr');
// getCountries('it');
// getCountries('de');
// getCountries('fr');
// getCountries('pl');
// getCountries('cz');

// getCountries('en')
	// .then(function(){getCountries('fr');});

var countries = ['en', 'si', 'hr', 'it', 'de', 'fr', 'pl', 'cz'];

_(countries).each( function( value, key, countries ) {

	getCountries(value)
		.then(sm.generate_xml)
		// .then(sm.saveToFile)
		.then(function(data){
			var conf = _.defaults({home: config.pathMap.live_sitemap + value}, config.sftp_dedi);
			return sm.saveOverSftp(data, conf);
		})
		.then(sm.gzip)
		.then(function(data){
			var conf = _.defaults({home: config.pathMap.live_sitemap + value, filename: 'sitemap.xml.gz'}, config.sftp_dedi);
			return sm.saveOverSftp(data, conf);
		})
		.then(
			function(rows){logger.info('done: ' + value);},
			function(err){logger.error(err);}
		)
});