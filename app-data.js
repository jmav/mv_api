//http://fabianosoriani.wordpress.com/2011/08/15/express-api-on-node-js-with-mysql-auth/
//rest: https://github.com/visionmedia/express-resource

var config = require('./config');
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

var getForecast = function() {

    var queryStr = 'SELECT IDResort, date, summit_cond FROM myweather_dnevni_napoved;';
    dbConProd1.query(queryStr, function(err, rows, fields) {
        if (err) throw err;

        var filteredList = _.chain(rows)
            .filter(function(dts) {
                var dtsDay = moment(dts.date).day();
                return dtsDay === 0 || dtsDay === 6;
            })
            .groupBy(function(obj) {
                return obj.IDResort;
            })
            .value();

        _.each(filteredList, function(obj, key) {
            var objS = {
                d6: '',
                d0: ''
            }; //V8 doesn't have insertation order
            _.each(obj, function(val, i) {
                var sumPerc = codelists.weatherSymbolsPercentage[val.summit_cond];
                if (typeof(sumPerc) === 'undefined') {
                    console.log('undefined weather symbol:', val);
                    sumPerc = 0;
                }
                var day = moment(val.date).day();
                objS['d' + day] = [val.summit_cond, sumPerc, moment(val.date).format('D.M.YYYY'), day];
            });
            filteredList[key] = objS;
        });

        saveFile(filteredList, 'MV.data.forecast', 'data-forecast.js');

    });
};

var getResortsIndex = function() {
    var diskImgList = fs.readdirSync(config.baseImageUrl);

    var queryStr = 'SELECT resorts.ID as rid, ' +
        '   IDCountry as cid, ' +
        '   resorts.title as title, ' +
        '   indexes.index as idx, ' +
        '   resorts_values.field, ' +
        '   LEFT(resorts_values.`value`, 20) as valorig, ' +
        '   IF(LEFT(field,4) = "seg_" AND resorts_values.`value` > "", TRUE, resorts_values.`value`) as val ' +
        'FROM resorts ' +
        'INNER JOIN indexes ON resorts.ID = indexes.tableID ' +
        'INNER JOIN resorts_values ON resorts.ID = resorts_values.IDResort ' +

        'WHERE resorts.visible = "True" ' +
        'AND indexes.table = "resorts" ' +
        'AND indexes.`default` = TRUE ' +
        'AND (resorts_values.lang = "en" OR resorts_values.lang = "") ' +
        'AND resorts_values.`value` > "" ' +
        'AND field IN("slopes_all","slopes_blue","slopes_red","slopes_black","slopes_green", ' +
        '   "slopes_number","slopes_cross","artificial_snow","airport_distance","gastronomy_restaurants", ' +
        '   "gastronomy_bars","sealevel_minheight","sealevel_maxheight","images","seg_family_ski", ' +
        '   "seg_free_style","seg_free_ride","seg_romantic","seg_cross_country","seg_ski_party","seg_ski_spa", ' +
        '   "publicw_thermal_spa","child_slope","child_lift","child_care","child_carpet_lift","child_park", ' +
        '   "snowboard_halfpipe","snowboard_funpark","snowboard_corner","snowboard_wave","snowboard_cross", ' +
        '   "snowboard_jumps","snowboard_slides","snowboard_boxen","snowboard_rides", "priority")';

    dbConProd1.query(queryStr, function(err, rows, fields) {
        if (err) throw err;

        var resorts = _.groupBy(rows, function(obj) {
            return obj.rid;
        });

        var resFiltered = _.map(resorts, function(obj, key, list) {
            var resObj = {
                // priority: obj.priority,
                id: obj[0].rid,
                cid: obj[0].cid,
                title: obj[0].title,
                idx: obj[0].idx,
                seg: [],
                s_park: [],
                family: [],
                other: []
            };

            _.each(obj, function(val) { //each field
                var fld = codelists.resortFieldsShort[val.field]; //|| val.field;

                if (fld === 'img') { //images
                    var strToArr = eval(val.val)[0] || '';
                    var exists = diskImgList.indexOf("resort_" + obj[0].rid + "_1_sm.jpg") !== -1; //check for maps
                    if (exists) {
                        resObj[fld] = 'map';
                    } else {
                        resObj[fld] = strToArr || 'no-image';
                    }
                    return;
                }

                if (_.isUndefined(fld)) {
                    _.each(codelists.resortsFieldsGroups, function(group, searchP) {
                        if (val.field.indexOf(searchP) === 0) resObj[group.groupName].push(group[val.field]);
                    });
                } else {
                    var valN = parseFloat(val.val.replace('False', 0), 10); //pretvorba num bol string
                    if (_.isNaN(val.val)) valN = val.val;
                    if (!_.isNull(valN)) resObj[fld] = valN;
                }
            });
            return resObj;
        });

        resFiltered = _.sortBy(resFiltered, function(objF) {
            // console.log(objF, key, list);
            return objF.pri;
        });

        saveFile(resFiltered, 'MV.country.data.resorts', 'resorts-index.js');

    });
};

var getInfo = function() {

    var queryStr = 'SELECT 88000 + SUM(nights) as nights ' +
        'FROM ( ' +
        'SELECT ' +
        '...booking2_cart.ID, ' +
        '...SUM(booking2_cart_content.stay) as nights ' +
        'FROM ' +
        '...booking2_cart ' +
        'LEFT JOIN ' +
        '...booking2_cart_content ON booking2_cart_content.IDCart = booking2_cart.ID ' +
        'LEFT JOIN ' +
        '...booking2_cart_content_persons ON booking2_cart_content_persons.IDContent=booking2_cart_content.ID ' +
        'WHERE booking2_cart.status="payment" ' +
        'AND booking2_cart.payment_status="completed" ' +
        'GROUP BY booking2_cart.ID) as nights_per_booking; ';

    dbConProd1.query(queryStr, function(err, rows, fields) {
        if (err) throw err;
        rows = rows[0];

        saveFile(rows, 'MV.data.info', 'data-info.js');
    });
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

        saveFile(countryGroup, 'MV.data.countries', 'data-countries.js');

    });
};

var getResorts = function() {

    var queryStr = 'SELECT ' +
        'IDCountry, ' +
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

        _.each(rows, function(resort){
            if(resort.id === 76){
                resort.title += ' (Vogel, Pokljuka)';
            }

            if(resort.id === 142){
                resort.title += ' (Terme snovik)';
            }

        });

        rows.push({
            IDCountry: 19,
            id: 76,
            title: 'Vogel',
            index: 'bohinj'
        }); //fake insert
        rows.push({
            IDCountry: 19,
            id: 76,
            title: 'Pokljuka',
            index: 'bohinj'
        }); //fake insert
        rows.push({
            IDCountry: 19,
            id: 142,
            title: 'Terme snovik',
            index: 'krvavec'
        }); //fake insert

        var resortGroup = _.map(rows, function(val) {
            return [val.title, val.id, val.index, val.IDCountry];
        });

        saveFile(resortGroup, 'MV.data.resorts', 'data-resorts.js');

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
var saveFile = function(data, varName, fileName) {
    var js = varName + '=' + JSON.stringify(data);

    mkdirp(config.baseExportPath, function (err) {
        if (err) return console.error(err);

        fs.writeFile(config.baseExportPath + '/' + fileName, js, function (err) {
          if (err) return console.error(err);
          console.log('File %s written!', fileName);
          process.exit();
        });
    });
};

// command line mode
var controller = argv.c;

if (controller) {
    timeMeasure = false;

    var methodMap = {
        countries: getCountries,
        resorts: getResorts,
        resortsIndexNew: getResortsIndex,
        info: getInfo,
        forecast: getForecast
    };

    var mCall = methodMap[controller];
    if (!mCall) {
        console.error('Wrong controler');
        process.exit(code = 0); //exit app
    }
    mCall();

} else {

    console.error('Wrong controler');
    process.exit(code = 0); //exit app

}