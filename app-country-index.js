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
	hbs = require('hbs'),
	inspect = require('eyes').inspector(),
	moment = require('moment'),
	log4js = require('log4js'),
	argv = require('optimist').argv;

/* ####     INIT     #### */


	//logging init
	log4js.configure({
		appenders: [ { type: "console" }],
		replaceConsole: true
	});

	var logger = log4js.getLogger(),
	startTimer,
	timeMeasure = true,
	app = express(),
	dbConLocal = mysql.createConnection(config.mysqlConn_local),
	dbConProd1 = mysql.createConnection(config.mysqlConn_1);

	//##### ENVIRONMENT VARIABLES
	var USELOCALDB = false;


	if (USELOCALDB) dbConProd1 = dbConLocal;






/* ####     APPS     #### */

	app.use(function(req, res, next) {
		domain.on("error", function(err) {
			console.log("error:" + err.message);
			res.writeHeader(500, {'Content-Type' : "text/html"});
			res.write("<h1>" + err.name + "</h1>");
			res.end("<p style='border:1px dotted red'>" + err.message + "</p>");

		});
		domain.enter();
		next();
	});

	// var d = domain.create();
	// d.on('error', function(er) {
	// 	console.error('Caught error!', er);
	// });
	// d.run(function() {
	// 	process.nextTick(function() {
	// 	setTimeout(function() { // simulating some various async stuff
	// 		fs.open('non-existent file', 'r', function(er, fd) {
	// 			if (er) throw er;
	// 		// proceed...
	// 		});
	// 	}, 100);
	// 	});
	// });


	// varr();

	//#####

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


	var headerTmpl = '<div><a href="/">Home</a></div>';

	var serverDest = _.keys(config.pathMap);

	var MV = { //Mountvacation workspace
		date: {
			next: function(day) { //0-6 sunday - shows upcomming days
				var plusWeek = (moment().day() >= day) ? 7 : 0;
				return moment().day(plusWeek + day).format();
			}
		},
		api: { //api routines
			readImageDir: function(req,res){


			},
			getForecast: function(req, res) {
				var action = req.params.action;

				var queryStr = 'SELECT IDResort, date, summit_cond FROM myweather_dnevni_napoved;';
				dbConProd1.query(queryStr, function(err, rows, fields) {
					if (err) throw err;

					var filteredList = _.chain(rows)
					.filter(function(dts){ var dtsDay = moment(dts.date).day(); return dtsDay === 0 || dtsDay === 6; })
					.groupBy(function(obj){return obj.IDResort;})
					.value();

					_.each(filteredList, function(obj, key){
						var objS = {d6:'', d0:''}; //V8 doesn't have insertation order
						_.each(obj, function(val,i){
							var sumPerc = codelists.weatherSymbolsPercentage[val.summit_cond];
							if (typeof(sumPerc) === 'undefined'){
								console.log('undefined weather symbol:', val);
								sumPerc = 0;
							}
							var day = moment(val.date).day();
							objS['d'+day] = [val.summit_cond, sumPerc, moment(val.date).format('D.M.YYYY'), day];
						});
						filteredList[key] = objS;
					});

					if(action){
			 			action = action.split(',');
						var idxJs = 'MV.data.forecast=' +  JSON.stringify(filteredList) + ';';
						_.each(action, function(server){
							var path = config.pathMap[server] || 'x'; //sym. error
							outSftp(res, idxJs, 'data-forecast.js', path);
						});
					} else {
						// outJS(res, filteredList, 'MV.data.info');
						outJSON(res, filteredList, 'MV.data.forecast');
					}
				});
			},
			getResortsIndexNew: function(req, res){
				var action = req.params.action;
				var diskImgList = fs.readdirSync(config.baseImageUrl);

				var queryStr = 'SELECT resorts.ID as rid, '+
					'	IDCountry as cid, '+
					'	resorts.title as title, '+
					'	indexes.index as idx, '+
					'	resorts_values.field, '+
					'	LEFT(resorts_values.`value`, 20) as valorig, '+
					'	IF(LEFT(field,4) = "seg_" AND resorts_values.`value` > "", TRUE, resorts_values.`value`) as val '+
					'FROM resorts '+
					'INNER JOIN indexes ON resorts.ID = indexes.tableID '+
					'INNER JOIN resorts_values ON resorts.ID = resorts_values.IDResort '+

					'WHERE resorts.visible = "True" '+
					'AND indexes.table = "resorts" '+
					'AND indexes.`default` = TRUE '+
					'AND (resorts_values.lang = "en" OR resorts_values.lang = "") '+
					'AND resorts_values.`value` > "" '+
					'AND field IN("slopes_all","slopes_blue","slopes_red","slopes_black","slopes_green", '+
					'	"slopes_number","slopes_cross","artificial_snow","airport_distance","gastronomy_restaurants", '+
					'	"gastronomy_bars","sealevel_minheight","sealevel_maxheight","images","seg_family_ski", '+
					'	"seg_free_style","seg_free_ride","seg_romantic","seg_cross_country","seg_ski_party","seg_ski_spa", '+
					'	"publicw_thermal_spa","child_slope","child_lift","child_care","child_carpet_lift","child_park", '+
					'	"snowboard_halfpipe","snowboard_funpark","snowboard_corner","snowboard_wave","snowboard_cross", '+
					'	"snowboard_jumps","snowboard_slides","snowboard_boxen","snowboard_rides", "priority")';

				dbConProd1.query(queryStr, function(err, rows, fields) {
					if (err) throw err;

					var resorts = _.groupBy(rows, function(obj){return obj.rid;});

					var resFiltered = _.map(resorts, function(obj, key, list){
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

						_.each(obj, function(val){ //each field
							var fld = codelists.resortFieldsShort[val.field]; //|| val.field;

							if(fld === 'img'){ //images
								var strToArr = eval(val.val)[0] || '';
								var exists = diskImgList.indexOf("resort_"+obj[0].rid+"_1_sm.jpg") !== -1;//check for maps
								if (exists) {
									resObj[fld] = 'map';
								} else {
									resObj[fld] = strToArr || 'no-image';
								}
								return;
							}

							if(_.isUndefined(fld)){
								_.each(codelists.resortsFieldsGroups, function(group, searchP){
									if(val.field.indexOf(searchP) === 0) resObj[group.groupName].push(group[val.field]);
								});
							} else {
								var valN = parseFloat(val.val.replace('False', 0), 10);//pretvorba num bol string
								if(_.isNaN(val.val)) valN = val.val;
								if(!_.isNull(valN)) resObj[fld] = valN;
							}
						});
						return resObj;
					});

					resFiltered = _.sortBy(resFiltered, function(objF){
						// console.log(objF, key, list);
						return objF.pri;
					});

					if(action){
			 			action = action.split(',');
						var idxJs = 'MV.country.data.resorts=' +  JSON.stringify(resFiltered);
						_.each(action, function(server){
							var path = config.pathMap[server] || 'x'; //sym. error
							outSftp(res, idxJs, 'resorts-index.js', path);
						});
					} else {
						// outJS(res, resFiltered, 'MV.country.data.resorts');
						outJSON(res, resFiltered, 'MV.country.data.resorts');
					}
				});
			},
			getAccShortDesc: function(req, res) {
				var action = req.params.action;

				var queryStr = 'SELECT IDAccommodation as aid, lang, CONCAT(LEFT(`value`, LOCATE(" ", `value`, 120)), "...") as val '+
					'FROM accommodations '+
					'INNER JOIN accommodations_values ON accommodations.ID = accommodations_values.IDAccommodation  '+
					'WHERE IDResort = 9436 '+
					'AND field = "description_short" '+
					'AND active = true '+
					'AND `value` > "" ';

				dbConProd1.query(queryStr, function(err, rows, fields) {
					if (err) throw err;

					var filteredList = _.chain(rows)
					// .filter(function(dts){ var dtsDay = moment(dts.date).day(); return dtsDay === 0 || dtsDay === 6; })
					//.groupBy(function(obj){return obj.aid;})
					.groupBy(function(obj){return obj.lang;})
					.value();

					if(action){
			 			action = action.split(',');
						var idxJs = 'MV.data.accShortDesc=' +  JSON.stringify(filteredList) + ';';
						_.each(action, function(server){
							var path = config.pathMap[server] || 'x'; //sym. error
							outSftp(res, idxJs, 'data-accShortDesc.js', path);
						});
					} else {
						// outJS(res, filteredList, 'MV.data.info');
						outJSON(res, filteredList, 'MV.data.accShortDesc');
					}
				});
			}
		}
	};



	bootstrapRoutes();

	function bootstrapRoutes() {
		app.all('*', function(req, res, next){
			startTimer = new Date();
			inspect(req.url);
			next();
		});

		app.get('/', getIndex);
		app.get('/countries', getCountries);
		app.get('/countries/:action', getCountries);
		app.get('/resorts', getResorts);
		app.get('/resorts/:action', getResorts);
		// app.get('/resortsIndex', getResortsIndex);
		// app.get('/resortsIndex/:action', getResortsIndex);
		app.get('/resortsIndexNew', MV.api.getResortsIndexNew);
		app.get('/resortsIndexNew/:action', MV.api.getResortsIndexNew);
		app.get('/info', getInfo);
		app.get('/info/:action', getInfo);
		app.get('/forecast', MV.api.getForecast);
		app.get('/forecast/:action', MV.api.getForecast);
		app.get('/accShortDesc', MV.api.getAccShortDesc);
		app.get('/accShortDesc/:action', MV.api.getAccShortDesc);
	}


	//Handlebar helpers
	hbs.registerHelper('link', function(object) {
		return new hbs.SafeString(
			'<a href="' + object.url + '">' + object.text + '</a>'
			);
	});
	hbs.registerHelper('select', function(object) {
		var html = '<select size="8" id="'+object.id+'" name="'+object.id+'" '+object.attr+'>';
		_.each(object.values, function (item) {
			//var selected = (inputFieldDesc.value() === item) ? 'selected="selected"' : '';
			html += '<option value="' + item.value + '">' + item.text + '</option>';
		});
		html += '</select>';
		return new hbs.SafeString(html);
	});
	// hbs.registerPartial('partial_name', 'partial value');



	//METHODS

	function getIndex(req, res){

		var data = {};

		data.routes = _.map(app.routes.get, function(val, key){
			return {url: val.path, text: val.path};
		});

		data.baseRoutes = {id:'baseRoutes',multi:false,attr:'multiple', values: _.filter(_.map(app.routes.get, function(val, key){
			return {"value": val.path, url: val.path, text: val.path};
		}), function(val){
			return (val.value.indexOf('/:') === -1);
		})};

		data.serverList = {id:'serverList',multi:false,attr:'multiple', values: _.map(serverDest, function(val, key){
			return {"value": val, url: val, text: val};
		})};
		// console.log(app.routes.get);

		//build list
		// _.each(app.routes.get, function(val, key){
		// 	data.urlList += '<li><a href="'+val.path+'">'+val.path+'</a></li>';
		// });

		//index html
		// var template = '<h2>List of api URLs</h2>'+headerTmpl+actionTmpl+
		// '<ul>'+urlList+'</ul>';
		// res.send(template);
		res.render('index.hbs', data);
	}

	function getInfo(req, res) {

		//Countries - group by lang
		var action = req.params.action;

		var queryStr = 'SELECT 88000 + SUM(nights) as nights '+
			'FROM ( '+
			'SELECT '+
			'	booking2_cart.ID, '+
			'	SUM(booking2_cart_content.stay) as nights '+
			'FROM '+
			'	booking2_cart '+
			'LEFT JOIN '+
			'	booking2_cart_content ON booking2_cart_content.IDCart = booking2_cart.ID '+
			'LEFT JOIN '+
			'	booking2_cart_content_persons ON booking2_cart_content_persons.IDContent=booking2_cart_content.ID '+
			'WHERE booking2_cart.status="payment" '+
			'AND booking2_cart.payment_status="completed" '+
			'GROUP BY booking2_cart.ID) as nights_per_booking; ';

		dbConProd1.query(queryStr, function(err, rows, fields) {
			if (err) throw err;
			rows = rows[0];

			if(action){
				action = action.split(',');
				var idxJs = 'MV.data.info=' +  JSON.stringify(rows) + ';';
				_.each(action, function(server){

					var path = config.pathMap[server] || 'x'; //sym. error
					outSftp(res, idxJs, 'data-info.js', path);
				});
			} else {
				// outJS(res, rows, 'MV.data.info');
				outJSON(res, rows, 'MV.data.countries');
			}
		});
	}

	function getCountries(req, res) {
		//Countries - group by lang
		var action = req.params.action;

		var queryStr = 'SELECT IDCountry, '+
			'`value` AS title,  '+
			'countries_values.lang, '+
			'`index` '+
			'FROM countries_values INNER JOIN indexes ON countries_values.IDCountry = indexes.tableID AND countries_values.lang = indexes.lang '+
			'WHERE countries_values.field = "title" '+
			'AND IDCountry NOT IN (21, 28, 22)  '+
			'GROUP BY countries_values.ID '+
			'ORDER BY `value` ';

		dbConProd1.query(queryStr, function(err, rows, fields) {
			if (err) throw err;

			var countryGroup = _.groupBy(rows, function(val){ return val.IDCountry; });


			_.each(countryGroup, function(obj, key, list){
				var nObj = {};

				_.each(obj, function(val, key) {

					nObj[val.lang] = [val.title || '', val.index];
					// Clone lang objects
					if ( val.lang === 'si' ) {
						nObj.sl = nObj[val.lang];
					}
					if ( val.lang === 'cz' ) {
						nObj.cs = nObj[val.lang];
					}

				});
				list[key] = nObj;
			});

			if(action){
				action = action.split(',');
				var idxJs = 'MV.data.countries=' +  JSON.stringify(countryGroup) + ';';
				_.each(action, function(server){
					var path = config.pathMap[server] || 'x'; //sym. error
					outSftp(res, idxJs, 'data-countries.js', path);
				});
			} else {
				// outJS(res, countryGroup, 'MV.data.countries');
				outJSON(res, countryGroup, 'MV.data.countries');
			}
		});
	}

	function getResorts(req, res){
		//Resorts - group by country
		var action = req.params.action;

		var queryStr = 'SELECT '+
							'IDCountry, '+
							'resorts.ID, '+
							'resorts.title, '+
							'`index` '+
						'FROM countries INNER JOIN resorts ON countries.ID = resorts.IDCountry '+
						'	INNER JOIN indexes ON resorts.ID = indexes.tableID '+
						'WHERE resorts.visible = TRUE '+
						'AND IDCountry NOT IN (21, 28, 22) '+
						'AND `default` = TRUE '+
						'AND indexes.table = "resorts" '+
						'GROUP BY resorts.ID '+
						'ORDER BY title ';

		dbConProd1.query(queryStr, function(err, rows, fields) {
			if (err) throw err;
			rows.push({ IDCountry: 19, ID: 76, title: 'Vogel', index: 'bohinj' }); //fake insert
			rows.push({ IDCountry: 19, ID: 142, title: 'Terme snovik', index: 'krvavec' }); //fake insert

			// countryGroup = _.groupBy(rows, function(val){ return val.IDCountry; });

			// _.each(countryGroup, function(obj, key, list){
			// 	var nObj = [];
			// 	_.each(obj, function(val, key) {console.log(key, val);
			// 		nObj.push([val.title || '', val.ID, val.index]);
			// 	});
			// 	list[key] = nObj;
			// });

			countryGroup = _.map(rows, function(val){
				return [val.title, val.ID, val.index, val.IDCountry];
			});

			if(action){
				action = action.split(',');
				var idxJs = 'MV.data.resorts=' +  JSON.stringify(countryGroup) + ';';
				_.each(action, function(server){
					var path = config.pathMap[server] || 'x'; //sym. error
					outSftp(res, idxJs, 'data-resorts.js', path);
				});
			} else {
				//outJS(res, countryGroup, 'MV.data.resorts');
				outJSON(res, countryGroup, 'MV.data.countries');
			}

			// countryList = _.pluck(rows, 'IDCountry');
			// countryList = _.union(countryList);

		});
	}

	function getResortsIndex(req, res){
		//JSON for country index page

		//dbConLocal.connect();

		var action = req.params.action;

		//http://www.mysqltutorial.org/stored-procedures-parameters.aspx
		//http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
		// var queryStr = 'SELECT ID as id, IDCountry as cid, title FROM resorts WHERE visible = "True"';
		var queryStr = 'SELECT resorts.ID as id, IDCountry as cid, resorts.title as title, indexes.index as idx '+
		'FROM resorts INNER JOIN indexes ON resorts.ID = indexes.tableID '+
		'WHERE resorts.visible = "True" AND indexes.table = "resorts" GROUP BY resorts.ID';

		dbConProd1.query(queryStr, function(err, resorts, fields) {
			if (err) throw err;

			//http://stackoverflow.com/questions/7653080/adding-to-an-array-asynchronously-in-node-js
			async.forEach(resorts, function (resort, callback){
				//console.log(resort); // print the key

				var resortIndexQuery = 'CALL resort_index('+resort.id+')';
				dbConLocal.query(resortIndexQuery, function(err, rows, fields) {
					if (err) throw err;

					rows[0].forEach(function(val, idx) {
						if(val.val === 'True') {
							resort[val.field] = true;
						} else if(val.field === 'family' || val.field === 's_park' || val.field === 'seg' || val.field === 'other'){
							if(val.val !== null) {
								var numArr = val.val.split(',');
								for(var i in numArr) { numArr[i] = parseInt(numArr[i], 10);}
								resort[val.field] = numArr;
							} else {
								resort[val.field] = [];
							}
						}else if (val.field === 'img'){

							var strToArr = eval(val.val)[0] || '';
							fs.exists(config.baseImageUrl + "resort_"+resort.id+"_1_sm.jpg", function(exists) { //check for maps
								if (exists) {
									resort[val.field] = 'map';
								} else {
									resort[val.field] = strToArr || 'no-image';
									// resort[val.field] = _.first(strToArr.match(/[\d]+$/)) || 'no-image'; //just image id
								}
							});

						} else {
							var valN = val.val.replace(',', '.');
							if(isNaN(valN)){
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
				resorts = _.sortBy(resorts, function(obj){
					return obj.title;
				});
				if(action){
		 			action = action.split(',');
					var idxJs = 'MV.country.data.resorts=' +  JSON.stringify(resorts);
					_.each(action, function(server){
						var path = config.pathMap[server] || 'x'; //sym. error
						outSftp(res, idxJs, 'resorts-index.js', path);
					});
				} else {
					// outJS(res, resorts, 'MV.country.data.resorts');
					outJSON(res, resorts, 'MV.country.data.resorts');
				}
			});

		});
	}

	function printTime(){
		if(timeMeasure) console.log('it took: ' + ((new Date() - startTimer)/1000) + ' s from req startTimer');
	}

	//sends to SFTP
	function outSftp (res, data, file, path) {
		var sftp = require('sftp');
		// var dataCp = iconv.convert(data);
		var dataCp = data;
		config.sftp_dedi.home = path;
		printTime();

		sftp = new sftp(
			config.sftp_dedi,
			function(err) {
				//Error
				if (err) throw err;

				//Success
				console.log("Connected to SFTP");

				//Write sample file
				sftp.writeFile(file, dataCp, "ascii", function(err) {
					if (err) throw err;
					var msg = "It's saved as: "+path+'/'+file + ' (' + (dataCp.length/1024).toFixed(2) + ' kB - '+dataCp.length+')';
					printTime();
					console.log(msg);
					res.send(msg);
				});
			}
		);
	}

	//sends to express
	function outJSON (res, data) {
		var json = JSON.stringify(data);
		printTime();
		res.contentType('application/json');
		res.send(json);
	}

	//sends to express
	function outJS (res, data, varName) {
		var js = varName + '=' +  JSON.stringify(data);
		printTime();
		res.contentType('application/text');
		res.send(js);
	}



	//END -> ctrl + c exit event
	process.on( 'SIGINT', function() {
		dbConLocal.end(); //end conn. to db
		dbConProd1.end(); //end conn. to db
		console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" );
		process.exit();
	});
	process.setMaxListeners(14);

//INIT

	// command line mode
	var cServer = argv.s,
	cPath = argv.p;

	if(cServer && cPath){
		timeMeasure = false;
		if(timeMeasure) startTimer = new Date();
		console.log('Command line mode...');
		var req = req = {params: {action: cServer}},
		res = {
			send: function(data){
				process.exit(code=0); //exit app
			}
		},
		methodMap = {
			countries: getCountries,
			resorts: getResorts,
			resortsIndexNew: MV.api.getResortsIndexNew,
			info: getInfo,
			forecast: MV.api.getForecast,
			accShortDesc: MV.api.getAccShortDesc
		};

		var mCall = methodMap[cPath];
		if(!mCall) {
			console.error('Wrong API call');
			process.exit(code=0); //exit app
		}
		mCall(req, res);


		// getInfo(req, res);
	} else {

		//start app
		app.listen(3001);
		console.log('Listening on port 3001');
		console.log('demo at: http://localhost:3001/resortsIndex');
		console.log("BE aware: images are checked at: " + config.baseImageUrl);
		//getResortsIndex();

	}
