var express = require('express');
var request = require('request');
var dotenv = require('dotenv').config()
var app = express();

var api_key = process.env.API_KEY;
var api_url = process.env.API_URL;

if (!api_key) {
  throw new Error('Missing `API_KEY` in env.');
}

app.use('/public', express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'views');

app.get('/', function(req, res) {
  if (req.query.stad) {
    res.redirect('/' + req.query.stad);
  } else {
  res.render('search.ejs');
  }
})

app.get('/:stad', function(req, res) {
  request(api_url + api_key + "?type=koop&zo=/" + req.params.stad + "/tuin/&page=1&pagesize=25", function (error, response, body) {
    var data = JSON.parse(body);
    res.render('index.ejs', {funda: data});
  });
})

var server = app.listen(1337, function() {
  console.log('Server is running on port leet');
})
