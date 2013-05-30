// Iconv  = require('iconv').Iconv;
// var iconv = new Iconv('UTF-8', 'ISO-8859-1');
// var latinBuf = iconv.convert('čćžđš');
// console.log(latinBuf);

// convert from UTF-8 to ISO-8859-1
// var Buffer = require('buffer').Buffer;
var Iconv  = require('iconv').Iconv;

var iconv = new Iconv('UTF-8', 'cp1250');
var aa = 'Hello, world!';
var buffer = iconv.convert(aa);
// var buffer2 = iconv.convert(new Buffer('Hello, world!'));
console.log(buffer, Buffer.byteLength(aa)/1024, 'Kb');
// assert.equals(buffer.inspect(), buffer2.inspect());
// do something useful with the buffers