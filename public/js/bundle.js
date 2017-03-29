(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./routes":3,"./sections":5}],2:[function(require,module,exports){
var sections = require('./sections');
var store = require('./store');

var request = {
  getDriverStandings: function() {  // Request driver standing .json
    this.doRequest(
      'http://ergast.com/api/f1/2016/driverStandings.json',
      function(response) {
        store.standingsArray = response.MRData.StandingsTable.StandingsLists[0].DriverStandings;
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

},{"./sections":5,"./store":6}],3:[function(require,module,exports){
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

},{"./request":2,"./routie.js":4,"./sections":5}],4:[function(require,module,exports){
var Routie = function(w, isModule) {

  var routes = [];
  var map = {};
  var reference = "routie";
  var oldReference = w[reference];

  var Route = function(path, name) {
    this.name = name;
    this.path = path;
    this.keys = [];
    this.fns = [];
    this.params = {};
    this.regex = pathToRegexp(this.path, this.keys, false, false);

  };

  Route.prototype.addHandler = function(fn) {
    this.fns.push(fn);
  };

  Route.prototype.removeHandler = function(fn) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      var f = this.fns[i];
      if (fn == f) {
        this.fns.splice(i, 1);
        return;
      }
    }
  };

  Route.prototype.run = function(params) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      this.fns[i].apply(this, params);
    }
  };

  Route.prototype.match = function(path, params){
    var m = this.regex.exec(path);

    if (!m) return false;


    for (var i = 1, len = m.length; i < len; ++i) {
      var key = this.keys[i - 1];

      var val = ('string' == typeof m[i]) ? decodeURIComponent(m[i]) : m[i];

      if (key) {
        this.params[key.name] = val;
      }
      params.push(val);
    }

    return true;
  };

  Route.prototype.toURL = function(params) {
    var path = this.path;
    for (var param in params) {
      path = path.replace('/:'+param, '/'+params[param]);
    }
    path = path.replace(/\/:.*\?/g, '/').replace(/\?/g, '');
    if (path.indexOf(':') != -1) {
      throw new Error('missing parameters for url: '+path);
    }
    return path;
  };

  var pathToRegexp = function(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/\+/g, '__plus__')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/__plus__/g, '(.+)')
      .replace(/\*/g, '(.*)');
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
  };

  var addHandler = function(path, fn) {
    var s = path.split(' ');
    var name = (s.length == 2) ? s[0] : null;
    path = (s.length == 2) ? s[1] : s[0];

    if (!map[path]) {
      map[path] = new Route(path, name);
      routes.push(map[path]);
    }
    map[path].addHandler(fn);
  };

  var routie = function(path, fn) {
    if (typeof fn == 'function') {
      addHandler(path, fn);
      routie.reload();
    } else if (typeof path == 'object') {
      for (var p in path) {
        addHandler(p, path[p]);
      }
      routie.reload();
    } else if (typeof fn === 'undefined') {
      routie.navigate(path);
    }
  };

  routie.lookup = function(name, obj) {
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (route.name == name) {
        return route.toURL(obj);
      }
    }
  };

  routie.remove = function(path, fn) {
    var route = map[path];
    if (!route)
      return;
    route.removeHandler(fn);
  };

  routie.removeAll = function() {
    map = {};
    routes = [];
  };

  routie.navigate = function(path, options) {
    options = options || {};
    var silent = options.silent || false;

    if (silent) {
      removeListener();
    }
    setTimeout(function() {
      window.location.hash = path;

      if (silent) {
        setTimeout(function() {
          addListener();
        }, 1);
      }

    }, 1);
  };

  routie.noConflict = function() {
    w[reference] = oldReference;
    return routie;
  };

  var getHash = function() {
    return window.location.hash.substring(1);
  };

  var checkRoute = function(hash, route) {
    var params = [];
    if (route.match(hash, params)) {
      route.run(params);
      return true;
    }
    return false;
  };

  var hashChanged = routie.reload = function() {
    var hash = getHash();
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (checkRoute(hash, route)) {
        return;
      }
    }
  };

  var addListener = function() {
    if (w.addEventListener) {
      w.addEventListener('hashchange', hashChanged, false);
    } else {
      w.attachEvent('onhashchange', hashChanged);
    }
  };

  var removeListener = function() {
    if (w.removeEventListener) {
      w.removeEventListener('hashchange', hashChanged);
    } else {
      w.detachEvent('onhashchange', hashChanged);
    }
  };
  addListener();

  if (isModule){
    return routie;
  } else {
    w[reference] = routie;
  }

};

if (typeof module == 'undefined'){
  Routie(window);
} else {
  module.exports = Routie(window,true);
}

},{}],5:[function(require,module,exports){
var store = require('./store');

var sections = {

  createStandingsList: function(sort) {
    var dataArray = store.standingsArray;

    // MDN example;
    if(sort === 'alfabetic') { // Sort alfabetic
      dataArray = dataArray.sort(function(a, b) {
        var nameA = a.Driver.givenName.toUpperCase(); // Sorting based on the given name
        var nameB = b.Driver.givenName.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // If names are equal
        return 0;
      });

    } else {
      dataArray = dataArray.sort(function(a, b) {
        return Number(a.position) - Number(b.position);
      });
    }

    document.querySelector('.list').innerHTML = " ";
    document.querySelector('.sort').innerHTML = " ";
    document.querySelector('.sort').innerHTML += `
      <button type="button" class="normal"> ⬇️ Position</li>
      <button type="button" class="alfabetic">🅰️ Alfabetic</li>`; // Only show these list items if race schedule is active

    document.querySelector('.normal').addEventListener('click', function() { // When normal click, normal list
      sections.createStandingsList();
    });
    document.querySelector('.alfabetic').addEventListener('click', function() { // When alfabetic click, normal list
      sections.createStandingsList('alfabetic');
    });

    dataArray.forEach(function(standing) { // Generate list items
      document.querySelector('.list').innerHTML += `
      <article>
        <h2>${standing.position}.</h2>
        <p> | </p>
        <h3>${standing.points}</h3>
        <p>${standing.Driver.givenName} ${standing.Driver.familyName}</p>
        <p class="constructor">${standing.Constructors[0].constructorId.replace(/_/g, ' ')}</p>
      </article>`;
    });
  },

  createDriversList: function(dataArray) {
    store.driversArray = dataArray; // save for later use
    // Hide other list
    document.querySelector('.list').innerHTML = " ";
    document.querySelector('.sort').innerHTML = " ";
    // Fill list with data
    dataArray.forEach(function(driver, index) {
      document.querySelector('.list').innerHTML += `
        <article>
          <a href="#driver/${index}">
            <h2>${driver.code}</h2>
            <p>${driver.givenName} ${driver.familyName}</p>
          </a>
        </article>
      `;
    });
  },

  createDriverOverlay: function(id) { // Create the overlay
    var driver = store.driversArray[id];
    document.querySelector('.overlay').innerHTML = `
    <div class="dialog">
      <p>First name: ${driver.givenName}</p>
      <p>Last name: ${driver.familyName}</p>
      <p>Nationality: ${driver.nationality}</p>
      <p>Date of Birth: ${driver.dateOfBirth}</p>
      <p>Wikipedia:</p>
      <a href="${driver.url}">${driver.code}</a>
    </div>
    `;

    this.toggleOverlay(); // Toggle the overlay
  },

  createRaceSchedule: function(dataArray) {
    document.querySelector('.list').innerHTML = " ";
    document.querySelector('.sort').innerHTML = " ";
    dataArray.forEach(function(race) {
      document.querySelector('.list').innerHTML += `
      <article>
        <h2>${race.raceName}</h2>
        <p class=date>${race.date}</p>
      </article>`;
    });
  },

  toggleOverlay: function() { // Hide the overlay
    var overlay = document.querySelector('.overlay');
    overlay.hidden = !overlay.hidden;
  },

  toggleSpinner: function() { // Toggle the spinner
    var spinner = document.querySelector('.preloader');
    spinner.classList.toggle('preloader-hidden');
  }
};

module.exports = sections;

},{"./store":6}],6:[function(require,module,exports){
var driversArray = []; // Store driver data
var standingsArray = []; // Store standing data

module.exports = {
  driversArray: driversArray,
  standingsArray: standingsArray
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYXBwLmpzIiwic3JjL2pzL3JlcXVlc3QuanMiLCJzcmMvanMvcm91dGVzLmpzIiwic3JjL2pzL3JvdXRpZS5qcyIsInNyYy9qcy9zZWN0aW9ucy5qcyIsInNyYy9qcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciByb3V0ZXMgPSByZXF1aXJlKCcuL3JvdXRlcycpO1xudmFyIHNlY3Rpb25zID0gcmVxdWlyZSgnLi9zZWN0aW9ucycpO1xuXG5yb3V0ZXMuaW5pdCgpO1xuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNlY3Rpb25zLnRvZ2dsZU92ZXJsYXkpOyAvLyBUb2dnbGVcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYScpXG4uZm9yRWFjaChmdW5jdGlvbihhKSB7XG4gIGEuc2V0QXR0cmlidXRlKCdocmVmJywgXCIjXCIgKyBhLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcbn0pO1xuXG52YXIgcmVtb3ZlU3RhbmRpbmdzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keSA+IHNlY3Rpb24nKTtcbnJlbW92ZVN0YW5kaW5ncy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHJlbW92ZVN0YW5kaW5ncyk7XG4iLCJ2YXIgc2VjdGlvbnMgPSByZXF1aXJlKCcuL3NlY3Rpb25zJyk7XG52YXIgc3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciByZXF1ZXN0ID0ge1xuICBnZXREcml2ZXJTdGFuZGluZ3M6IGZ1bmN0aW9uKCkgeyAgLy8gUmVxdWVzdCBkcml2ZXIgc3RhbmRpbmcgLmpzb25cbiAgICB0aGlzLmRvUmVxdWVzdChcbiAgICAgICdodHRwOi8vZXJnYXN0LmNvbS9hcGkvZjEvMjAxNi9kcml2ZXJTdGFuZGluZ3MuanNvbicsXG4gICAgICBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBzdG9yZS5zdGFuZGluZ3NBcnJheSA9IHJlc3BvbnNlLk1SRGF0YS5TdGFuZGluZ3NUYWJsZS5TdGFuZGluZ3NMaXN0c1swXS5Ecml2ZXJTdGFuZGluZ3M7XG4gICAgICAgIHNlY3Rpb25zLmNyZWF0ZVN0YW5kaW5nc0xpc3QoKTtcbiAgICAgIH1cbiAgICApO1xuICB9LFxuXG4gIGdldFJhY2VEcml2ZXJzOiBmdW5jdGlvbigpIHsgLy8gUmVxdWVzdCByYWNlIGRyaXZlcnMgLmpzb25cbiAgICB0aGlzLmRvUmVxdWVzdChcbiAgICAgICdodHRwOi8vZXJnYXN0LmNvbS9hcGkvZjEvMjAxNi9kcml2ZXJzLmpzb24nLCAvLyB1cmxcbiAgICAgIGZ1bmN0aW9uKHJlc3BvbnNlKSB7IC8vIGNhbGxiYWNrRnVuY3Rpb25cbiAgICAgICAgc2VjdGlvbnMuY3JlYXRlRHJpdmVyc0xpc3QocmVzcG9uc2UuTVJEYXRhLkRyaXZlclRhYmxlLkRyaXZlcnMpO1xuICAgICAgfVxuICAgICk7XG4gIH0sXG5cbiAgZ2V0UmFjZVNjaGVkdWxlOiBmdW5jdGlvbigpIHsgLy8gUmVxdWVzdCB0aGUgcmFjZSBzY2hlZHVsZSBmb3IgdGhlIHVwY29taW5nIHNlYXNvbiAuanNvblxuICAgIHRoaXMuZG9SZXF1ZXN0KFxuICAgICAgJ2h0dHA6Ly9lcmdhc3QuY29tL2FwaS9mMS8yMDE3Lmpzb24nLFxuICAgICAgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgc2VjdGlvbnMuY3JlYXRlUmFjZVNjaGVkdWxlKHJlc3BvbnNlLk1SRGF0YS5SYWNlVGFibGUuUmFjZXMpO1xuICAgICAgfVxuICAgICk7XG4gIH0sXG5cblxuICBkb1JlcXVlc3Q6IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2tGdW5jdGlvbikgeyAvLyBYTE1IdHRwUmVxdWVzdCB3aXRoIGRpZmZlcmVudCAuanNvbiB1cmwgYXMgcGFyYW1ldGVyXG4gICAgc2VjdGlvbnMudG9nZ2xlU3Bpbm5lcigpO1xuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKTtcblxuICAgICAgY2FsbGJhY2tGdW5jdGlvbihyZXNwb25zZSk7XG4gICAgICBzZWN0aW9ucy50b2dnbGVTcGlubmVyKCk7IC8vIFRvZ2dsZSB0aGUgc3Bpbm5lciBldmVyeXRpbWUgeW91IGRvIHRoZSByZXF1ZXN0XG4gICAgfSk7XG4gICAgcmVxdWVzdC5zZW5kKCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdDtcbiIsInZhciByZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0Jyk7XG52YXIgc2VjdGlvbnMgPSByZXF1aXJlKCcuL3NlY3Rpb25zJyk7XG52YXIgcm91dGllID0gcmVxdWlyZSgnLi9yb3V0aWUuanMnKVxuXG52YXIgcm91dGVzID0ge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICByb3V0aWUoe1xuICAgICAgJyc6IGZ1bmN0aW9uKCkgeyAvLyBTaG93IHN0YW5kaW5nIHdoZW4gZmlyc3QgcmVxdWVzdCBpcyBmaXJlZFxuICAgICAgICByZXF1ZXN0LmdldERyaXZlclN0YW5kaW5ncygpO1xuICAgICAgfSxcbiAgICAgICdzdGFuZGluZ3MnOiBmdW5jdGlvbigpIHsgLy8gU2FtZSBhcyBhYm92ZSBidXQgbm90IHRoZSBicm93c2VyIGRvZXNuJ3QgcmVsb2FkXG4gICAgICAgIHJlcXVlc3QuZ2V0RHJpdmVyU3RhbmRpbmdzKCk7XG4gICAgICB9LFxuICAgICAgJ2RyaXZlcnMnOiBmdW5jdGlvbigpIHsgLy8gRHJpdmVycyBvdmVydmlld1xuICAgICAgICByZXF1ZXN0LmdldFJhY2VEcml2ZXJzKCk7XG4gICAgICB9LFxuICAgICAgJ2RyaXZlci86aWQnOiBmdW5jdGlvbihpZCkgeyAvLyBEcml2ZXJzIGRldGFpbFxuICAgICAgICBzZWN0aW9ucy5jcmVhdGVEcml2ZXJPdmVybGF5KGlkKTtcbiAgICAgIH0sXG4gICAgICAncmFjZXMnOiBmdW5jdGlvbigpIHsgLy8gUmFjZSBzY2hlZHVsZVxuICAgICAgICByZXF1ZXN0LmdldFJhY2VTY2hlZHVsZSgpO1xuICAgICAgfVxuICB9KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSByb3V0ZXM7XG4iLCJ2YXIgUm91dGllID0gZnVuY3Rpb24odywgaXNNb2R1bGUpIHtcblxuICB2YXIgcm91dGVzID0gW107XG4gIHZhciBtYXAgPSB7fTtcbiAgdmFyIHJlZmVyZW5jZSA9IFwicm91dGllXCI7XG4gIHZhciBvbGRSZWZlcmVuY2UgPSB3W3JlZmVyZW5jZV07XG5cbiAgdmFyIFJvdXRlID0gZnVuY3Rpb24ocGF0aCwgbmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmtleXMgPSBbXTtcbiAgICB0aGlzLmZucyA9IFtdO1xuICAgIHRoaXMucGFyYW1zID0ge307XG4gICAgdGhpcy5yZWdleCA9IHBhdGhUb1JlZ2V4cCh0aGlzLnBhdGgsIHRoaXMua2V5cywgZmFsc2UsIGZhbHNlKTtcblxuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICB0aGlzLmZucy5wdXNoKGZuKTtcbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUucmVtb3ZlSGFuZGxlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMgPSB0aGlzLmZucy5sZW5ndGg7IGkgPCBjOyBpKyspIHtcbiAgICAgIHZhciBmID0gdGhpcy5mbnNbaV07XG4gICAgICBpZiAoZm4gPT0gZikge1xuICAgICAgICB0aGlzLmZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIGZvciAodmFyIGkgPSAwLCBjID0gdGhpcy5mbnMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB0aGlzLmZuc1tpXS5hcHBseSh0aGlzLCBwYXJhbXMpO1xuICAgIH1cbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbihwYXRoLCBwYXJhbXMpe1xuICAgIHZhciBtID0gdGhpcy5yZWdleC5leGVjKHBhdGgpO1xuXG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cblxuICAgIGZvciAodmFyIGkgPSAxLCBsZW4gPSBtLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5rZXlzW2kgLSAxXTtcblxuICAgICAgdmFyIHZhbCA9ICgnc3RyaW5nJyA9PSB0eXBlb2YgbVtpXSkgPyBkZWNvZGVVUklDb21wb25lbnQobVtpXSkgOiBtW2ldO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHRoaXMucGFyYW1zW2tleS5uYW1lXSA9IHZhbDtcbiAgICAgIH1cbiAgICAgIHBhcmFtcy5wdXNoKHZhbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnRvVVJMID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XG4gICAgZm9yICh2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKCcvOicrcGFyYW0sICcvJytwYXJhbXNbcGFyYW1dKTtcbiAgICB9XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvOi4qXFw/L2csICcvJykucmVwbGFjZSgvXFw/L2csICcnKTtcbiAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgIT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBwYXJhbWV0ZXJzIGZvciB1cmw6ICcrcGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9O1xuXG4gIHZhciBwYXRoVG9SZWdleHAgPSBmdW5jdGlvbihwYXRoLCBrZXlzLCBzZW5zaXRpdmUsIHN0cmljdCkge1xuICAgIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gcGF0aDtcbiAgICBpZiAocGF0aCBpbnN0YW5jZW9mIEFycmF5KSBwYXRoID0gJygnICsgcGF0aC5qb2luKCd8JykgKyAnKSc7XG4gICAgcGF0aCA9IHBhdGhcbiAgICAgIC5jb25jYXQoc3RyaWN0ID8gJycgOiAnLz8nKVxuICAgICAgLnJlcGxhY2UoL1xcL1xcKC9nLCAnKD86LycpXG4gICAgICAucmVwbGFjZSgvXFwrL2csICdfX3BsdXNfXycpXG4gICAgICAucmVwbGFjZSgvKFxcLyk/KFxcLik/OihcXHcrKSg/OihcXCguKj9cXCkpKT8oXFw/KT8vZywgZnVuY3Rpb24oXywgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBvcHRpb25hbCl7XG4gICAgICAgIGtleXMucHVzaCh7IG5hbWU6IGtleSwgb3B0aW9uYWw6ICEhIG9wdGlvbmFsIH0pO1xuICAgICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgICByZXR1cm4gJycgKyAob3B0aW9uYWwgPyAnJyA6IHNsYXNoKSArICcoPzonICsgKG9wdGlvbmFsID8gc2xhc2ggOiAnJykgKyAoZm9ybWF0IHx8ICcnKSArIChjYXB0dXJlIHx8IChmb3JtYXQgJiYgJyhbXi8uXSs/KScgfHwgJyhbXi9dKz8pJykpICsgJyknICsgKG9wdGlvbmFsIHx8ICcnKTtcbiAgICAgIH0pXG4gICAgICAucmVwbGFjZSgvKFtcXC8uXSkvZywgJ1xcXFwkMScpXG4gICAgICAucmVwbGFjZSgvX19wbHVzX18vZywgJyguKyknKVxuICAgICAgLnJlcGxhY2UoL1xcKi9nLCAnKC4qKScpO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHBhdGggKyAnJCcsIHNlbnNpdGl2ZSA/ICcnIDogJ2knKTtcbiAgfTtcblxuICB2YXIgYWRkSGFuZGxlciA9IGZ1bmN0aW9uKHBhdGgsIGZuKSB7XG4gICAgdmFyIHMgPSBwYXRoLnNwbGl0KCcgJyk7XG4gICAgdmFyIG5hbWUgPSAocy5sZW5ndGggPT0gMikgPyBzWzBdIDogbnVsbDtcbiAgICBwYXRoID0gKHMubGVuZ3RoID09IDIpID8gc1sxXSA6IHNbMF07XG5cbiAgICBpZiAoIW1hcFtwYXRoXSkge1xuICAgICAgbWFwW3BhdGhdID0gbmV3IFJvdXRlKHBhdGgsIG5hbWUpO1xuICAgICAgcm91dGVzLnB1c2gobWFwW3BhdGhdKTtcbiAgICB9XG4gICAgbWFwW3BhdGhdLmFkZEhhbmRsZXIoZm4pO1xuICB9O1xuXG4gIHZhciByb3V0aWUgPSBmdW5jdGlvbihwYXRoLCBmbikge1xuICAgIGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWRkSGFuZGxlcihwYXRoLCBmbik7XG4gICAgICByb3V0aWUucmVsb2FkKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIgcCBpbiBwYXRoKSB7XG4gICAgICAgIGFkZEhhbmRsZXIocCwgcGF0aFtwXSk7XG4gICAgICB9XG4gICAgICByb3V0aWUucmVsb2FkKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByb3V0aWUubmF2aWdhdGUocGF0aCk7XG4gICAgfVxuICB9O1xuXG4gIHJvdXRpZS5sb29rdXAgPSBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYyA9IHJvdXRlcy5sZW5ndGg7IGkgPCBjOyBpKyspIHtcbiAgICAgIHZhciByb3V0ZSA9IHJvdXRlc1tpXTtcbiAgICAgIGlmIChyb3V0ZS5uYW1lID09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHJvdXRlLnRvVVJMKG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJvdXRpZS5yZW1vdmUgPSBmdW5jdGlvbihwYXRoLCBmbikge1xuICAgIHZhciByb3V0ZSA9IG1hcFtwYXRoXTtcbiAgICBpZiAoIXJvdXRlKVxuICAgICAgcmV0dXJuO1xuICAgIHJvdXRlLnJlbW92ZUhhbmRsZXIoZm4pO1xuICB9O1xuXG4gIHJvdXRpZS5yZW1vdmVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICBtYXAgPSB7fTtcbiAgICByb3V0ZXMgPSBbXTtcbiAgfTtcblxuICByb3V0aWUubmF2aWdhdGUgPSBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIHNpbGVudCA9IG9wdGlvbnMuc2lsZW50IHx8IGZhbHNlO1xuXG4gICAgaWYgKHNpbGVudCkge1xuICAgICAgcmVtb3ZlTGlzdGVuZXIoKTtcbiAgICB9XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcblxuICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFkZExpc3RlbmVyKCk7XG4gICAgICAgIH0sIDEpO1xuICAgICAgfVxuXG4gICAgfSwgMSk7XG4gIH07XG5cbiAgcm91dGllLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICB3W3JlZmVyZW5jZV0gPSBvbGRSZWZlcmVuY2U7XG4gICAgcmV0dXJuIHJvdXRpZTtcbiAgfTtcblxuICB2YXIgZ2V0SGFzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG4gIH07XG5cbiAgdmFyIGNoZWNrUm91dGUgPSBmdW5jdGlvbihoYXNoLCByb3V0ZSkge1xuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICBpZiAocm91dGUubWF0Y2goaGFzaCwgcGFyYW1zKSkge1xuICAgICAgcm91dGUucnVuKHBhcmFtcyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHZhciBoYXNoQ2hhbmdlZCA9IHJvdXRpZS5yZWxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFzaCA9IGdldEhhc2goKTtcbiAgICBmb3IgKHZhciBpID0gMCwgYyA9IHJvdXRlcy5sZW5ndGg7IGkgPCBjOyBpKyspIHtcbiAgICAgIHZhciByb3V0ZSA9IHJvdXRlc1tpXTtcbiAgICAgIGlmIChjaGVja1JvdXRlKGhhc2gsIHJvdXRlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBhZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgIHcuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VkLCBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHcuYXR0YWNoRXZlbnQoJ29uaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VkKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHcucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgaGFzaENoYW5nZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3LmRldGFjaEV2ZW50KCdvbmhhc2hjaGFuZ2UnLCBoYXNoQ2hhbmdlZCk7XG4gICAgfVxuICB9O1xuICBhZGRMaXN0ZW5lcigpO1xuXG4gIGlmIChpc01vZHVsZSl7XG4gICAgcmV0dXJuIHJvdXRpZTtcbiAgfSBlbHNlIHtcbiAgICB3W3JlZmVyZW5jZV0gPSByb3V0aWU7XG4gIH1cblxufTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ3VuZGVmaW5lZCcpe1xuICBSb3V0aWUod2luZG93KTtcbn0gZWxzZSB7XG4gIG1vZHVsZS5leHBvcnRzID0gUm91dGllKHdpbmRvdyx0cnVlKTtcbn1cbiIsInZhciBzdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcblxudmFyIHNlY3Rpb25zID0ge1xuXG4gIGNyZWF0ZVN0YW5kaW5nc0xpc3Q6IGZ1bmN0aW9uKHNvcnQpIHtcbiAgICB2YXIgZGF0YUFycmF5ID0gc3RvcmUuc3RhbmRpbmdzQXJyYXk7XG5cbiAgICAvLyBNRE4gZXhhbXBsZTtcbiAgICBpZihzb3J0ID09PSAnYWxmYWJldGljJykgeyAvLyBTb3J0IGFsZmFiZXRpY1xuICAgICAgZGF0YUFycmF5ID0gZGF0YUFycmF5LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICB2YXIgbmFtZUEgPSBhLkRyaXZlci5naXZlbk5hbWUudG9VcHBlckNhc2UoKTsgLy8gU29ydGluZyBiYXNlZCBvbiB0aGUgZ2l2ZW4gbmFtZVxuICAgICAgICB2YXIgbmFtZUIgPSBiLkRyaXZlci5naXZlbk5hbWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKG5hbWVBIDwgbmFtZUIpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVBID4gbmFtZUIpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5hbWVzIGFyZSBlcXVhbFxuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0pO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGRhdGFBcnJheSA9IGRhdGFBcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIE51bWJlcihhLnBvc2l0aW9uKSAtIE51bWJlcihiLnBvc2l0aW9uKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saXN0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNvcnQnKS5pbm5lckhUTUwgPSBcIiBcIjtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc29ydCcpLmlubmVySFRNTCArPSBgXG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cIm5vcm1hbFwiPiDirIfvuI8gUG9zaXRpb248L2xpPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJhbGZhYmV0aWNcIj7wn4Ww77iPIEFsZmFiZXRpYzwvbGk+YDsgLy8gT25seSBzaG93IHRoZXNlIGxpc3QgaXRlbXMgaWYgcmFjZSBzY2hlZHVsZSBpcyBhY3RpdmVcblxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5ub3JtYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkgeyAvLyBXaGVuIG5vcm1hbCBjbGljaywgbm9ybWFsIGxpc3RcbiAgICAgIHNlY3Rpb25zLmNyZWF0ZVN0YW5kaW5nc0xpc3QoKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxmYWJldGljJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHsgLy8gV2hlbiBhbGZhYmV0aWMgY2xpY2ssIG5vcm1hbCBsaXN0XG4gICAgICBzZWN0aW9ucy5jcmVhdGVTdGFuZGluZ3NMaXN0KCdhbGZhYmV0aWMnKTtcbiAgICB9KTtcblxuICAgIGRhdGFBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHN0YW5kaW5nKSB7IC8vIEdlbmVyYXRlIGxpc3QgaXRlbXNcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saXN0JykuaW5uZXJIVE1MICs9IGBcbiAgICAgIDxhcnRpY2xlPlxuICAgICAgICA8aDI+JHtzdGFuZGluZy5wb3NpdGlvbn0uPC9oMj5cbiAgICAgICAgPHA+IHwgPC9wPlxuICAgICAgICA8aDM+JHtzdGFuZGluZy5wb2ludHN9PC9oMz5cbiAgICAgICAgPHA+JHtzdGFuZGluZy5Ecml2ZXIuZ2l2ZW5OYW1lfSAke3N0YW5kaW5nLkRyaXZlci5mYW1pbHlOYW1lfTwvcD5cbiAgICAgICAgPHAgY2xhc3M9XCJjb25zdHJ1Y3RvclwiPiR7c3RhbmRpbmcuQ29uc3RydWN0b3JzWzBdLmNvbnN0cnVjdG9ySWQucmVwbGFjZSgvXy9nLCAnICcpfTwvcD5cbiAgICAgIDwvYXJ0aWNsZT5gO1xuICAgIH0pO1xuICB9LFxuXG4gIGNyZWF0ZURyaXZlcnNMaXN0OiBmdW5jdGlvbihkYXRhQXJyYXkpIHtcbiAgICBzdG9yZS5kcml2ZXJzQXJyYXkgPSBkYXRhQXJyYXk7IC8vIHNhdmUgZm9yIGxhdGVyIHVzZVxuICAgIC8vIEhpZGUgb3RoZXIgbGlzdFxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saXN0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNvcnQnKS5pbm5lckhUTUwgPSBcIiBcIjtcbiAgICAvLyBGaWxsIGxpc3Qgd2l0aCBkYXRhXG4gICAgZGF0YUFycmF5LmZvckVhY2goZnVuY3Rpb24oZHJpdmVyLCBpbmRleCkge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpc3QnKS5pbm5lckhUTUwgKz0gYFxuICAgICAgICA8YXJ0aWNsZT5cbiAgICAgICAgICA8YSBocmVmPVwiI2RyaXZlci8ke2luZGV4fVwiPlxuICAgICAgICAgICAgPGgyPiR7ZHJpdmVyLmNvZGV9PC9oMj5cbiAgICAgICAgICAgIDxwPiR7ZHJpdmVyLmdpdmVuTmFtZX0gJHtkcml2ZXIuZmFtaWx5TmFtZX08L3A+XG4gICAgICAgICAgPC9hPlxuICAgICAgICA8L2FydGljbGU+XG4gICAgICBgO1xuICAgIH0pO1xuICB9LFxuXG4gIGNyZWF0ZURyaXZlck92ZXJsYXk6IGZ1bmN0aW9uKGlkKSB7IC8vIENyZWF0ZSB0aGUgb3ZlcmxheVxuICAgIHZhciBkcml2ZXIgPSBzdG9yZS5kcml2ZXJzQXJyYXlbaWRdO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuaW5uZXJIVE1MID0gYFxuICAgIDxkaXYgY2xhc3M9XCJkaWFsb2dcIj5cbiAgICAgIDxwPkZpcnN0IG5hbWU6ICR7ZHJpdmVyLmdpdmVuTmFtZX08L3A+XG4gICAgICA8cD5MYXN0IG5hbWU6ICR7ZHJpdmVyLmZhbWlseU5hbWV9PC9wPlxuICAgICAgPHA+TmF0aW9uYWxpdHk6ICR7ZHJpdmVyLm5hdGlvbmFsaXR5fTwvcD5cbiAgICAgIDxwPkRhdGUgb2YgQmlydGg6ICR7ZHJpdmVyLmRhdGVPZkJpcnRofTwvcD5cbiAgICAgIDxwPldpa2lwZWRpYTo8L3A+XG4gICAgICA8YSBocmVmPVwiJHtkcml2ZXIudXJsfVwiPiR7ZHJpdmVyLmNvZGV9PC9hPlxuICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgICB0aGlzLnRvZ2dsZU92ZXJsYXkoKTsgLy8gVG9nZ2xlIHRoZSBvdmVybGF5XG4gIH0sXG5cbiAgY3JlYXRlUmFjZVNjaGVkdWxlOiBmdW5jdGlvbihkYXRhQXJyYXkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlzdCcpLmlubmVySFRNTCA9IFwiIFwiO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zb3J0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZGF0YUFycmF5LmZvckVhY2goZnVuY3Rpb24ocmFjZSkge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpc3QnKS5pbm5lckhUTUwgKz0gYFxuICAgICAgPGFydGljbGU+XG4gICAgICAgIDxoMj4ke3JhY2UucmFjZU5hbWV9PC9oMj5cbiAgICAgICAgPHAgY2xhc3M9ZGF0ZT4ke3JhY2UuZGF0ZX08L3A+XG4gICAgICA8L2FydGljbGU+YDtcbiAgICB9KTtcbiAgfSxcblxuICB0b2dnbGVPdmVybGF5OiBmdW5jdGlvbigpIHsgLy8gSGlkZSB0aGUgb3ZlcmxheVxuICAgIHZhciBvdmVybGF5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKTtcbiAgICBvdmVybGF5LmhpZGRlbiA9ICFvdmVybGF5LmhpZGRlbjtcbiAgfSxcblxuICB0b2dnbGVTcGlubmVyOiBmdW5jdGlvbigpIHsgLy8gVG9nZ2xlIHRoZSBzcGlubmVyXG4gICAgdmFyIHNwaW5uZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucHJlbG9hZGVyJyk7XG4gICAgc3Bpbm5lci5jbGFzc0xpc3QudG9nZ2xlKCdwcmVsb2FkZXItaGlkZGVuJyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2VjdGlvbnM7XG4iLCJ2YXIgZHJpdmVyc0FycmF5ID0gW107IC8vIFN0b3JlIGRyaXZlciBkYXRhXG52YXIgc3RhbmRpbmdzQXJyYXkgPSBbXTsgLy8gU3RvcmUgc3RhbmRpbmcgZGF0YVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZHJpdmVyc0FycmF5OiBkcml2ZXJzQXJyYXksXG4gIHN0YW5kaW5nc0FycmF5OiBzdGFuZGluZ3NBcnJheVxufVxuIl19
