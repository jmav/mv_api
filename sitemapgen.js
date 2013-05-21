var config = require('./config'),
_ = require('underscore'),
zlib = require('zlib'),
Q = require('q'),
fs = require('fs'),
pd = require('pretty-data').pd,
moment = require('moment'),
log4js = require('log4js');

//Promises supported xml generator

// init
var logger = log4js.getLogger();


var sm ={
	generate_xml: function(url_list, options) {
		var deferred = Q.defer();

		// url_list = array of objects, [{ url: '/hr/svicarska/zermatt/hotel-astoria/' }, { url: '/hr/svicarska/zermatt/hotel-beau-rivage/' }, { url: '/hr/svicarska/zermatt/hotel-bijou/' }]

		// if(!_.isObject(options)) deferred.reject(new Error("options parameter must be defined, or empty object"));
		options = _.defaults({ //defaults
			rootPath: 'http://www.mountvacation.com',
			priority: 0.5,
			freq: 'monthly',
			lastmod: moment().format("YYYY-MM-DD")
		}, options);

		//XML template
		var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
		_.each(url_list, function(element, index, list){
			xml += '<url>';
			xml += '<loc>'+ options.rootPath + element.url + '</loc>';
			xml += '<changefreq>'+ (element.freq || options.freq) +'</changefreq>';
			xml += '<priority>'+ (element.priority || options.priority) +'</priority>';
			xml += '<lastmod>'+ (element.lastmod || options.lastmod) +'</lastmod>';
			xml += '</url>';
		});
		xml += '</urlset>';
		deferred.resolve(xml);

		return deferred.promise;
	},
	gzip: function(data, options){
		var deferred = Q.defer();

		zlib.gzip(new Buffer(data, 'utf8'), function(err, data) {
			if(err) deferred.reject(err);
			deferred.resolve(data);
		});

		return deferred.promise;
	},
	saveToFile: function(data, options){
		var deferred = Q.defer();
		options = _.defaults(options, { //defaults
			filename: 'sitemap.xml'
		});

		fs.writeFile(options.filename, data, function(err) {
			if(err) deferred.reject(err);
			var cprs = '';
			logger.info("The file: "+options.filename+" was saved!");
			deferred.resolve(data);
		});

		return deferred.promise;
	},
	saveOverSftp: function(data, config) {
		var deferred = Q.defer();
		var config = _.defaults(config, {
			host       : 'www.sample.com',
			home       : '/',
			username   : 'user',
			port       : '22',
			filename   : 'sitemap.xml'
		});

		var sftpO = new sftp(
			config,
			function(err) {
				if(err) deferred.reject(err);

				//Success
				// logger.info("Connected to SFTP");

				//Write sample file
				sftpO.writeFile(config.filename, data, "utf8", function(err) {
					if(err) deferred.reject(err);
					var msg = "It's saved as: "+config.home+'/'+config.filename + ' (' + (data.length/1024).toFixed(2) + ' kB - '+data.length+')';
					logger.info(msg);
					deferred.resolve(data);
				});
			}
		);

		return deferred.promise;
	},
	printErr: function(err) {
		// var nl = err.stack.indexOf('/n');
		var nl = 100;
		var err_txt = err.substr(0, nl);
		logger.error(err_txt);
	}

};


_.extend(exports, sm);
