//http://stackoverflow.com/questions/5869216/how-to-store-node-js-deployment-settings-configuration-files
var config = {
	mysqlConn_local: {
		host     : '',
		database : '',
		user     : '',
		password : ''
	},
	mysqlConn_1: {
		host     : '',
		database : '',
		user     : '',
		password : ''
	},
	sftp_1: {
		host       : '',
		home       : '',
		username   : '',
		password   : '',
		port       : ''
	},
	pathMap: {
		live : 'live',
		test : 'test',
		test1: 'test1'
	}
};

module.exports = config;

