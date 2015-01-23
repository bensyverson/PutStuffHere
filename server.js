connect = require('connect');
connect.createServer(
  connect.compiler({ src: __dirname + ".", enable: ['less'] }),
  connect.staticProvider(__dirname + ".")
).listen(3000);

livereload = require('livereload');
server = livereload.createServer({exts: ['less']});
server.watch(__dirname + ".");
