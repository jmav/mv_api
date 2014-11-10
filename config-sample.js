//http://stackoverflow.com/questions/5869216/how-to-store-node-js-deployment-settings-configuration-files
var config = {
	mysqlConn_local: {
		host     : '',
		database : '',
		user     : '',
		password : ''
	},
	pathMap: {
		live : 'live',
		test : 'test'
	},
	baseImageUrl: ''
};

module.exports = config;

