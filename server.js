var express = require('express');
var request = require('request');
var dotenv = require('dotenv').config();
var app = express();

var api_url_standing = process.env.API_URL_DRIVERSTANDINGS;
var api_url_driver = process.env.API_URL_RACEDRIVERS;
var api_url_raceschedule = process.env.API_URL_RACESCHEDULE;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'views');

app.get('/', function(req, res) {
  request(api_url_standing, function(error, response, body) {
    var data = JSON.parse(body);
    res.render('standings.ejs', {standings: data.MRData.StandingsTable.StandingsLists[0].DriverStandings});
  });
})

app.get('/standings', function(req, res) {
  request(api_url_standing, function(error, response, body) {
    var data = JSON.parse(body);
    res.render('standings.ejs', {standings: data.MRData.StandingsTable.StandingsLists[0].DriverStandings});
  });
})

app.get('/drivers', function(req, res) {
  request(api_url_driver, function(error, response, body) {
    var data = JSON.parse(body);
    res.render('drivers.ejs', {drivers: data.MRData.DriverTable.Drivers});
  });
})

app.get('/races', function(req, res) {
  request(api_url_raceschedule, function(error, response, body) {
    var data = JSON.parse(body);
    res.render('races.ejs', {races: data.MRData.RaceTable.Races});
  });
})

var server = app.listen(1337, function () {
   console.log('The server is running.')
})
