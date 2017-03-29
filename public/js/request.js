var sections = require('./sections');

var request = {
  getDriverStandings: function() {  // Request driver standing .json
    this.doRequest(
      'http://ergast.com/api/f1/2016/driverStandings.json',
      function(response) {
        app.standingsArray = response.MRData.StandingsTable.StandingsLists[0].DriverStandings;
        sections.createStandingsList();
      }
    );
  },

  getRaceDrivers: function() { // Request race drivers .json
    this.doRequest(
      'http://ergast.com/api/f1/2016/drivers.json', // url
      function(response) { // callbackFunction
        sections.createDriversList(response.MRData.DriverTable.Drivers);
      }
    );
  },

  getRaceSchedule: function() { // Request the race schedule for the upcoming season .json
    this.doRequest(
      'http://ergast.com/api/f1/2017.json',
      function(response) {
        sections.createRaceSchedule(response.MRData.RaceTable.Races);
      }
    );
  },


  doRequest: function(url, callbackFunction) { // XLMHttpRequest with different .json url as parameter
    sections.toggleSpinner();
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.addEventListener('load', function() {
      var response = JSON.parse(request.response);

      callbackFunction(response);
      sections.toggleSpinner(); // Toggle the spinner everytime you do the request
    });
    request.send();
  }
};

module.exports = request;
