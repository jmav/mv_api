//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config'),
    codelists = require('./codelists'),
    express = require('express'),
    domain = require('domain').create(),
    mysql = require('mysql'),
    async = require('async'),
    _ = require('underscore'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    moment = require('moment'),
    argv = require('optimist').argv;

var languages = [
        'en',
        'de',
        'it',
        'fr',
        'hr',
        'sl',
        'cs',
        'pl'
    ];

/* ####     INIT     #### */
var startTimer,
    timeMeasure = true,
    app = express(),
    dbConLocal = mysql.createConnection(config.mysqlConn_local),
    dbConProd1 = mysql.createConnection(config.mysqlConn_1);

//##### ENVIRONMENT VARIABLES
var USELOCALDB = false;

if (USELOCALDB) dbConProd1 = dbConLocal;

var MV = { //Mountvacation workspace
    date: {
        next: function(day) { //0-6 sunday - shows upcomming days
            var plusWeek = (moment().day() >= day) ? 7 : 0;
            return moment().day(plusWeek + day).format();
        }
    },
    api: { //api routines
        readImageDir: function(req, res) {

        },
    }
};

var getCountries = function() {

    //Countries - group by lang
    var queryStr = 'SELECT ' +
        'countries_values.IDCountry, countries_values.`value` AS title,  countries_values.lang, indexes.`index` ' +
        'FROM countries_values ' +
        '        INNER JOIN countries ' +
        '                ON countries_values.IDCountry = countries.ID AND countries.active = true ' +
        '        INNER JOIN indexes ' +
        '                ON countries_values.IDCountry = indexes.tableID AND countries_values.lang = indexes.lang         ' +
        'WHERE countries_values.field = "title" ' +
        'AND countries_values.IDCountry NOT IN (21, 28, 22)  ' +
        'GROUP BY countries_values.ID  ' +
        'ORDER BY title ';

    dbConProd1.query(queryStr, function(err, rows, fields) {
        if (err) throw err;

        var countryGroup = _.groupBy(rows, function(val) {
            return val.IDCountry;
        });

        _.each(countryGroup, function(obj, key, list) {
            var nObj = {};

            _.each(obj, function(val, key) {

                nObj[val.lang] = [val.title || '', val.index];
                // Clone lang objects
                if (val.lang === 'si') {
                    nObj.sl = nObj[val.lang];
                }
                if (val.lang === 'cz') {
                    nObj.cs = nObj[val.lang];
                }

            });
            list[key] = nObj;
        });

        var data = 'MV.data.countries=' + JSON.stringify(countryGroup);
        // use process.exit to exit parsing all languages
        saveFile(data, 'data-countries.js', function(){
            process.exit(code = 0);
        });

    });
};

var getRegions = function(lang, callback) {

    var queryStr =  'SELECT regions.ID as id, regions_values.value as title, regions.IDCountry AS IDCountry ' +
                    'FROM regions ' +
                    '   INNER JOIN regions_values ON regions_values.IDRegion = regions.ID AND regions_values.field = "title" ' +
                    'WHERE lang = ?';

    dbConProd1.query(queryStr, [lang], function(err, rows, fields) {

        if (err) throw err;

        var data = 'MV.data.regions=' + JSON.stringify(rows);
        saveFile(data, 'data-set-' + lang + '.js', callback);

    });

};

var getResorts = function() {

    var queryStr = 'SELECT ' +
        'IDCountry, ' +
        'IDRegion, ' +
        'resorts.ID as id, ' +
        'resorts.title, ' +
        '`index` ' +
        'FROM countries INNER JOIN resorts ON countries.ID = resorts.IDCountry ' +
        '   INNER JOIN indexes ON resorts.ID = indexes.tableID ' +
        'WHERE resorts.visible = TRUE ' +
        'AND IDCountry NOT IN (21, 28, 22) ' +
        'AND `default` = TRUE ' +
        'AND indexes.table = "resorts" ' +
        'GROUP BY resorts.ID ' +
        'ORDER BY title ';

    dbConProd1.query(queryStr, function(err, rows, fields) {

        if (err) throw err;

        _.each(rows, function(resort) {
            if (resort.id === 76) {
                resort.title += ' (Vogel, Pokljuka)';
            }

            if (resort.id === 142) {
                resort.title += ' (Terme snovik)';
            }

        });

        rows.push({
            IDCountry: 19,
            IDRegion: 4252,
            id: 76,
            title: 'Vogel',
            index: 'bohinj'
        }); //fake insert
        rows.push({
            IDCountry: 19,
            IDRegion: 4252,
            id: 76,
            title: 'Pokljuka',
            index: 'bohinj'
        }); //fake insert
        rows.push({
            IDCountry: 19,
            IDRegion: 4252,
            id: 142,
            title: 'Terme snovik',
            index: 'krvavec'
        }); //fake insert

        var resortGroup = _.map(rows, function(val) {
            return [val.title, val.id, val.index, val.IDCountry, val.IDRegion];
        });

        var data = 'MV.data.resorts=' + JSON.stringify(resortGroup);
        // use process.exit to exit parsing all languages
        saveFile(data, 'data-resorts.js', function(){
            process.exit(code = 0);
        });

    });
};

var getResortsIndex = function() {

    //http://www.mysqltutorial.org/stored-procedures-parameters.aspx
    //http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
    var queryStr = 'SELECT resorts.ID as id, IDCountry as cid, resorts.title as title, indexes.index as idx ' +
        'FROM resorts INNER JOIN indexes ON resorts.ID = indexes.tableID ' +
        'WHERE resorts.visible = "True" AND indexes.table = "resorts" GROUP BY resorts.ID';

    dbConProd1.query(queryStr, function(err, resorts, fields) {
        if (err) throw err;

        //http://stackoverflow.com/questions/7653080/adding-to-an-array-asynchronously-in-node-js
        async.forEach(resorts, function(resort, callback) {
            //console.log(resort); // print the key

            var resortIndexQuery = 'CALL resort_index(' + resort.id + ')';
            dbConLocal.query(resortIndexQuery, function(err, rows, fields) {
                if (err) throw err;

                rows[0].forEach(function(val, idx) {
                    if (val.val === 'True') {
                        resort[val.field] = true;
                    } else if (val.field === 'family' || val.field === 's_park' || val.field === 'seg' || val.field === 'other') {
                        if (val.val !== null) {
                            var numArr = val.val.split(',');
                            for (var i in numArr) {
                                numArr[i] = parseInt(numArr[i], 10);
                            }
                            resort[val.field] = numArr;
                        } else {
                            resort[val.field] = [];
                        }
                    } else if (val.field === 'img') {

                        var strToArr = eval(val.val)[0] || '';
                        fs.exists(config.baseImageUrl + "resort_" + resort.id + "_1_sm.jpg", function(exists) { //check for maps
                            if (exists) {
                                resort[val.field] = 'map';
                            } else {
                                resort[val.field] = strToArr || 'no-image';
                                // resort[val.field] = _.first(strToArr.match(/[\d]+$/)) || 'no-image'; //just image id
                            }
                        });

                    } else {
                        var valN = val.val.replace(',', '.');
                        if (isNaN(valN)) {
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
            resorts = _.sortBy(resorts, function(obj) {
                return obj.title;
            });

            saveFile(resorts, 'MV.country.data.resorts', 'resorts-index.js');

        });

    });
};

//save to file
var saveFile = function(data, fileName, callback) {

    mkdirp(config.baseExportPath, function(err) {
        if (err) throw err;

        fs.writeFile(config.baseExportPath + '/' + fileName, data, function(err) {

            if (err) throw err;

            console.log('File %s written!', fileName);
            if(callback){
                callback(true);
            }

        });
    });
};

// command line mode
var controller = argv.c;

if (controller) {
    timeMeasure = false;

    var methodMap = {
        countries: getCountries,
        regions: getRegions,
        resorts: getResorts
    };

    var mCall = methodMap[controller];
    if (!mCall) {
        console.error('Wrong controler');
        process.exit(code = 0); //exit app
    }

    // Parse for each lang
    async.every(languages, mCall, function(){
        process.exit(code = 0);
    });

} else {

    console.error('Wrong controler');
    process.exit(code = 0); //exit app

}