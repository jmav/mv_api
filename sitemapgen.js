var config = require('./config'),
	_ = require('underscore'),
	zlib = require('zlib'),
	Q = require('q'),
	fs = require('fs'),
	pd = require('pretty-data').pd,
	moment = require('moment'),
	sftp = require('sftp'),
	log4js = require('log4js');

//Promises supported xml generator

// init
var logger = log4js.getLogger();


var sm ={
	generateXml: function(options) {
		var deferred = Q.defer(),
			url_list = options.data;

		// url_list = array of objects, [{ url: '/hr/svicarska/zermatt/hotel-astoria/' }, { url: '/hr/svicarska/zermatt/hotel-beau-rivage/' }, { url: '/hr/svicarska/zermatt/hotel-bijou/' }]

		// if(!_.isObject(options)) deferred.reject(new Error("options parameter must be defined, or empty object"));
		options = _.defaults({ //defaults
			rootPath: 'http://' + options.domain + '/',
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

		options.data = xml;
		options.filename = options.domain + '-sitemap.xml';

		deferred.resolve(options);

		return deferred.promise;
	},
	gzip: function(options){
		var deferred = Q.defer(),
			buffer = new Buffer(options.data, 'utf8');

		zlib.gzip( buffer, function(err, data) {
			if( err ) {
				deferred.reject(err);
			}

			options.data = data;

			deferred.resolve( options );
		});

		options.filename = options.domain + '-sitemap.xml.gz';


		return deferred.promise;
	},
	mkDistDir: function(options){

		var deferred = Q.defer();

		fs.mkdir(options.dist, function(err){
			if(err && err.code !== 'EEXIST') {
				if (err.code === 'ENOENT') {
					err = ('No such file or directory ' + path + '!');
				}
				deferred.reject(err);
			} else {
				deferred.resolve(options);
			}
		});
		return deferred.promise;
	},
	saveToFile: function(options){

		var deferred = Q.defer(),
			path = 'dist/' + options.filename;

		fs.writeFile(path, options.data, function(err) {
			if(err) {
				if (err.code === 'ENOENT') {
					err = ('No such file or directory ' + path + '!');
				}
				deferred.reject(err);
			} else {
				var cprs = '';
				logger.info("The file: " + options.filename + " was saved!");
				deferred.resolve(options);
			}
		});

		return deferred.promise;
	},
	saveOverSftp: function(options) {
		var deferred = Q.defer();

		dbConfig = config.sftp_api1;

		var sftpO = new sftp( dbConfig,
			function(err) {
				if(err) deferred.reject(err);

				//Success
				// logger.info("Connected to SFTP");

				//Write sample file
				sftpO.writeFile(options.filename, options.data, "utf8", function(err) {
					if(err) deferred.reject(err);
					var msg = "It's saved as: "+dbConfig.home+'/'+options.filename + ' (' + (options.data.length/1024).toFixed(2) + ' kB - '+options.data.length+')';
					logger.info(msg);
					deferred.resolve(options);
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
