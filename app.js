require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { connectToDatabase } = require('./database');
const { readFileGpsNmea, saveNmeaToDb } = require('./store/gpsNmea');
const { readFileSensors, saveSensorsToDb } = require('./store/sensors');
const chokidar = require('chokidar');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

connectToDatabase().catch(console.error);


const fakesondePath = path.join(__dirname, 'fakesonde/temp');

const watcher = chokidar.watch([
  path.join(fakesondePath, 'gpsNmea'),
  path.join(fakesondePath, 'sensors')
]);

watcher.on('change', async (filePath) => {
  try {
    console.log(`Fichier modifié : ${filePath}`);
    console.log(`Nom du fichier : ${path.basename(filePath)}`);
    
    if (path.basename(filePath) === 'gpsNmea') {
      const nmeaData = await readFileGpsNmea(filePath);
      await saveNmeaToDb(nmeaData);
      console.log('Données GPS NMEA sauvegardées');
    }
    
    if (path.basename(filePath) === 'sensors') {
      const sensorsData = await readFileSensors(filePath);
      await saveSensorsToDb(sensorsData);
      console.log('Données capteurs sauvegardées');
    }
  } catch (error) {
    console.error('Erreur lors du traitement du fichier', filePath, ':', error);
  }
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
