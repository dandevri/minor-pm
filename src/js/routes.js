var request = require('./request');
var sections = require('./sections');
var routie = require('./routie.js')

var routes = {
  init: function() {
    routie({
      '': function() { // Show standing when first request is fired
        request.getDriverStandings();
      },
      'standings': function() { // Same as above but not the browser doesn't reload
        request.getDriverStandings();
      },
      'drivers': function() { // Drivers overview
        request.getRaceDrivers();
      },
      'driver/:id': function(id) { // Drivers detail
        sections.createDriverOverlay(id);
      },
      'races': function() { // Race schedule
        request.getRaceSchedule();
      }
  });
  }
};

module.exports = routes;
