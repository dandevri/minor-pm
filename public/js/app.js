var routes = require('./routes');

var app = {
  driversArray: [], // Store driver data
  standingsArray: [], // Store standing data

  init: function() {
    routes.init();
    document.querySelector('.overlay').addEventListener('click', sections.toggleOverlay); // Toggle overlay
  }
};

app.init();
