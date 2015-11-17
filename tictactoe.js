var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var winston = require('winston');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var serveStatic = require('serve-static');

var app = express();

// all environments
app.set('port', process.env.PORT || 8080);
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(serveStatic(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(errorhandler());
}

app.get('/q', routes.q);
app.post('/q', routes.q);

http.createServer(app).listen(app.get('port'), function(){
  winston.info('Express server listening on port ' + app.get('port'));
});
