//generate sitemap.xml from active DB & copy it to server
var config = require('./config'),
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
    dbConProd1 = mysql.createConnection(config.mysqlConn_1),
    domains = require('./config/domains.json').production,
    domainsQ = [];

domains = _.omit(domains, ['default']);

// get urls from DB
var getUrls = function(options) {

    if (!options.lang) {
        return;
    }

    var deferred = Q.defer();

    config.sftp_api1.home = config.pathMap['live_sitemap'] + options.lang; //set sftp path

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

        // if(rows[0].url.indexOf('//') != -1){ //bug fix, some (hr, sp ...) domains have root
        // 	rows.splice(0, 0);
        // }
        // rows.unshift({url:'/'+options.lang+'/', priority: 1, freq: 'daily'}); //append domain root
        options.data = rows;
        options.fields = fields;
        options.dist = 'dist';

        deferred.resolve(options);
    });

    return deferred.promise;
};

_.each(domains, function(attrs, domain) {

    attrs.domain = domain;

    var domainQ = getUrls(attrs)
        .then(sm.mkDistDir)
        .then(sm.generateXml)
        // .then( sm.saveToFile )
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