var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
const crypto = require('crypto');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/smarthome');

var routes = require('./routes/index');
var users = require('./routes/users');
//var Forecast = require('forecast');
//var weather = require('weather');
/*
var forecast = new Forecast({
  service: 'forecast.io',
  key: 'de429ae576460a9df2841c58a439751f',
  units: 'celcius', // Only the first letter is parsed 
  cache: true,      // Cache API requests? 
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/ 
    minutes: 27,
    seconds: 45
    }
});
*/
var options = {
  key: fs.readFileSync('authen/key.pem'),
  cert: fs.readFileSync('authen/cert.pem')
};
var credentials = crypto.createCredentials(options);

var app = express();
//for https//var server = require('https').Server(options,app);
var server = require('http').Server(app);
//server.setSecure(credentials);
io = require('socket.io')(server);
server.listen(3000);
mySocket={};

//TODO
io.on('connection', function(socket){
	console.log('a user connected');
	mySocket=socket;
	//console.log("socket is" + JSON.stringify(mySocket));

	var collection = db.get('lightcollection');
	collection.find({},{},function(err, results) {
		for (var i=0;i<results.length;i++)
		mySocket.emit("updateLight",results[i]);
	});

	var collection = db.get('thermostat');
	collection.find({"room":'home'},{},function(err, results) {
		console.log(results);
		mySocket.emit("updateThermostat",results[0]);
	});

	var collection = db.get('powercollection');
	collection.find({"room":'home'},{},function(err, results) {
		console.log(results);
		mySocket.emit("updatePowerDisp",results[0]);
	});
	
	socket.on('updateLight',function(socket){
		var collection = db.get('lightcollection');
		collection.update({"light":socket.light},{$set:{"state":socket.state}},function(err, results) {
			console.log(results);
		});
/*
		weather({location: 'Melbourne'}, function(data) {
		console.log("Damn it's hot!"+data.temp);
		console.log(data);
		});
		forecast.get([-33.8683, 151.2086], function(err, weather) {
		  if(err) return console.dir(err);
		  console.log(weather);
		});
*/
		mySocket.emit("updateLight",socket);
	});

	socket.on('updateMessage',function(socket){
		console.log(socket);
	});

	socket.on("updateImage", function(info) {
	var img = 'data:image/jpeg;base64,' + info.buffer;
	console.log('received sending Image')
	mySocket.emit("updateImage",info);
	});

	socket.on('updatePower',function(socket){
		console.log(socket.batteryPercentage);
		var collection = db.get('powercollection');
		collection.update({"room":"home"},{$set:{"batteryPercentage":socket.batteryPercentage,"solarPower":socket.solarPower,"lightPower":socket.lightPower,"acPower":socket.acPower,"piPower":socket.piPower}},function(err, results) {
		console.log(results);
		mySocket.emit("updatePowerDisp",socket);
	});
});
});
/*
io.on('connection', function(socket){
	console.log('a user connected');
	mySocket=socket;
	//console.log("socket is" + JSON.stringify(mySocket));

	var collection = db.get('lightcollection');
	collection.find({"light":'switch1a'},{},function(err, results) {
	console.log(results);
	mySocket.emit("updateLight",results);
	});

});
*/
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
