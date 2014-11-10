//generate sitemap.xml from active DB & copy it to server
var config = require('./config'),
    Q = require('q'),
    mysql = require('mysql'),
    moment = require('moment'),
    zlib = require('zlib'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    _ = require('underscore');

//dev modules
var inspect = require('eyes').inspector();

// init
var dbConProd1 = mysql.createConnection(config.mysqlConn_1),
    domains = require('./config/domains.json').production,
    domainsQ = [];

domains = _.omit(domains, ['default']);



//Promises supported xml generator
var sm = {
    generateXml: function(options) {
        var deferred = Q.defer(),
            url_list = options.data;

        options = _.defaults({ //defaults
            rootPath: 'http://' + options.domain + '/',
            priority: 0.5,
            freq: 'monthly',
            lastmod: moment().format("YYYY-MM-DD")
        }, options);

        //XML template
        var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        _.each(url_list, function(element, index, list) {
            xml += '<url>';
            xml += '<loc>' + options.rootPath + element.url + '</loc>';
            xml += '<changefreq>' + (element.freq || options.freq) + '</changefreq>';
            xml += '<priority>' + (element.priority || options.priority) + '</priority>';
            xml += '<lastmod>' + (element.lastmod || options.lastmod) + '</lastmod>';
            xml += '</url>';
        });
        xml += '</urlset>';

        options.data = xml;
        options.filename = options.domain + '-sitemap.xml';

        deferred.resolve(options);

        return deferred.promise;
    },
    gzip: function(options) {

        var deferred = Q.defer(),
            buffer = new Buffer(options.data, 'utf8');

        zlib.gzip(buffer, function(err, data) {
            if (err) {
                deferred.reject(err);
            }

            options.data = data;

            deferred.resolve(options);
        });

        options.filename = options.domain + '-sitemap.xml.gz';


        return deferred.promise;
    },
    saveToFile: function(options) {

        var deferred = Q.defer(),
            path = options.dist + '/' + options.filename;

        mkdirp(options.dist, function(err) {
            if (err) return console.error(err);



            fs.writeFile(path, options.data, function(err) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        err = ('No such file or directory ' + path + '!');
                    }
                    deferred.reject(err);
                } else {
                    var cprs = '';
                    console.info("The file: " + options.filename + " was saved!");
                    deferred.resolve(options);
                }
            });


        });

        return deferred.promise;
    },
    printErr: function(err) {
        var nl = 100;
        var err_txt = err.substr(0, nl);
        console.error(err_txt);
    }

};



// **************
// APP
// **************

// get urls from DB
var getUrls = function(options) {

    if (!options.lang) {
        return;
    }

    var deferred = Q.defer();

    var queryStr = 'SELECT url, ' +
        'CASE  ' +
        '    WHEN path LIKE "accommodation.%" THEN 0.8 ' +
        '    WHEN path LIKE "resort.%" THEN 0.9 ' +
        '    WHEN path LIKE "resortfinder.%" THEN 0.7 ' +
        '    else 0.5 ' +
        'END as priority ' +
        'FROM routing  ' +
        'WHERE lang = ? ' +
        'AND active = 1 ' +
        'AND redirect = 0 ' +
        'ORDER BY url ';


    dbConProd1.query(queryStr, [options.lang], function(err, rows, fields) {
        if (err) deferred.reject(err);

        options.data = rows;
        options.fields = fields;
        options.dist = config.baseSitemapsExportPath;

        deferred.resolve(options);
    });

    return deferred.promise;
};

_.each(domains, function(attrs, domain) {

    attrs.domain = domain;

    var domainQ = getUrls(attrs)
        .then(sm.generateXml)
        .then(sm.gzip)
        .then(sm.saveToFile);

    domainsQ.push(domainQ);

});

// Q.allSettled(domainsQ)
Q.all(domainsQ)
    .then(function(results, err) {

        if (err) {
            console.error(err);
            process.exit(code = 1);
        } else {
            console.info('All sitemaps build-ed successfully!');
            process.exit(code = 0);

        }

    })
    .fail(function(err) {
        console.error(err);
        process.exit(code = 1);
    });