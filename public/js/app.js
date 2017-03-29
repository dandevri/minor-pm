var routes = require('./routes');
var sections = require('./sections');

routes.init();
document.querySelector('.overlay').addEventListener('click', sections.toggleOverlay); // Toggle
