//Here is an example on how to use it:

var config     = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.mysqlConn);

connection.connect();

connection.query('SELECT countries.title FROM countries;', function(err, rows, fields) {
  if (err) throw err;

  console.log('echo', rows);
});

connection.end();

// From this example, you can learn the following:

// * Every method you invoke on a connection is queued and executed in sequence.
// * Closing the connection is done using `end()` which makes sure all remaining
//   queries are executed before sending a quit packet to the mysql server.