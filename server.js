var express = require('express');
var request = require('request');
var dotenv = require('dotenv').config();
var app = express();

var api_url_driver = process.env.API_URL_DRIVERSTANDINGS;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'views');

app.get('/', function(req, res) {
  request(api_url_driver, function(error, response, body) {
    var data = JSON.parse(body);
    res.render('index.ejs', {driver: data});
  });
})

var server = app.listen(1337, function () {
   console.log('The server is running.')
})
