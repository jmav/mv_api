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



// HELPER: #key_value
//
// Usage: {{#key_value obj}} Key: {{key}} // Value: {{value}} {{/key_value}}
//
// Iterate over an object, setting 'key' and 'value' for each property in
// the object.
hbs.registerHelper("key_value", function(obj, fn) {
	var buffer = "",
	key;
	for (key in obj) {
console.log('a', key);
		if (obj.hasOwnProperty(key)) {
			buffer += fn({key: key, value: obj[key]});
		}
	}

	return buffer;
});

// HELPER: #each_with_key
//
// Usage: {{#each_with_key container key="myKey"}}...{{/each_with_key}}
//
// Iterate over an object containing other objects. Each
// inner object will be used in turn, with an added key ("myKey")
// set to the value of the inner object's key in the container.
hbs.registerHelper("each_with_key", function(obj, fn) {
	var context,
	buffer = "",
	key,
	keyName = fn.hash.key;

	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			context = obj[key];

			if (keyName) {
				context[keyName] = key;
			}

			buffer += fn(context);
		}
	}

	return buffer;
});



//app
var app = express();

//Web index
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

function db(){

	var countries = ['', 'si', 'hr', 'it', 'de', 'fr', 'pl', 'cz', 'en'];

	// _(countries).each( function( value, key, countries ) {


	// });



}



function getIndex(req, res){

	getUrls()
		.then(
			function(rows){
			var groupedUrls = _.toArray(_.groupBy(rows, function(url){
					// console.log(num, num.url.substring(1,3));

					return url.IDResort;
				}));
console.log(groupedUrls);

				var aa = [
					{1: [{url: '/cz/rakousko/flachau/', lang: 'cz', IDCountry: 8, IDResort: 2 }, {url: '/cz/rakousko/flachau/', lang: 'cz', IDCountry: 8, IDResort: 2 }]},
					{2: [{url: '/cz/rakousko/flachau/', lang: 'cz', IDCountry: 8, IDResort: 2 }, {url: '/cz/rakousko/flachau/', lang: 'cz', IDCountry: 8, IDResort: 2 }]}
				]

				var data = { urls: groupedUrls };

				res.render('index-cache.hbs', data);

			},
			function(err){logger.error(err);}
		);


}




app.listen(3005);
console.log('Listening on port 3005');
console.log('demo at: http://localhost:3005/cache-update');