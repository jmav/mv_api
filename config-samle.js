//http://stackoverflow.com/questions/5869216/how-to-store-node-js-deployment-settings-configuration-files

var config = {};

config.mysqlConn = {
  host     : 'localhost',
  database : '',
  user     : '',
  password : ''
};

module.exports = config;