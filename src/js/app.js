var routes = require('./routes');
var sections = require('./sections');

routes.init();
document.querySelector('.overlay').addEventListener('click', sections.toggleOverlay); // Toggle

document.querySelectorAll('a')
.forEach(function(a) {
  a.setAttribute('href', "#" + a.getAttribute('href'));
});

var removeStandings = document.querySelector('body > section');
removeStandings.parentNode.removeChild(removeStandings);
