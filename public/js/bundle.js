(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var routes = require('./routes');
var sections = require('./sections');

routes.init();
document.querySelector('.overlay').addEventListener('click', sections.toggleOverlay); // Toggle

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
      <li>
        <h2>${standing.position}.</h2>
        <p> | </p>
        <h3>${standing.points}</h3>
        <p>${standing.Driver.givenName} ${standing.Driver.familyName}</p>
        <p class="constructor">${standing.Constructors[0].constructorId.replace(/_/g, ' ')}</p>
      </li>`;
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
        <li>
          <a href="#driver/${index}">
            <h2>${driver.code}</h2>
            <p>${driver.givenName} ${driver.familyName}</p>
          </a>
        </li>
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
      <li>
        <h2>${race.raceName}</h2>
        <p class=date>${race.date}</p>
      </li>`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwLmpzIiwicHVibGljL2pzL3JlcXVlc3QuanMiLCJwdWJsaWMvanMvcm91dGVzLmpzIiwicHVibGljL2pzL3JvdXRpZS5qcyIsInB1YmxpYy9qcy9zZWN0aW9ucy5qcyIsInB1YmxpYy9qcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJvdXRlcyA9IHJlcXVpcmUoJy4vcm91dGVzJyk7XG52YXIgc2VjdGlvbnMgPSByZXF1aXJlKCcuL3NlY3Rpb25zJyk7XG5cbnJvdXRlcy5pbml0KCk7XG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2VjdGlvbnMudG9nZ2xlT3ZlcmxheSk7IC8vIFRvZ2dsZVxuIiwidmFyIHNlY3Rpb25zID0gcmVxdWlyZSgnLi9zZWN0aW9ucycpO1xudmFyIHN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgcmVxdWVzdCA9IHtcbiAgZ2V0RHJpdmVyU3RhbmRpbmdzOiBmdW5jdGlvbigpIHsgIC8vIFJlcXVlc3QgZHJpdmVyIHN0YW5kaW5nIC5qc29uXG4gICAgdGhpcy5kb1JlcXVlc3QoXG4gICAgICAnaHR0cDovL2VyZ2FzdC5jb20vYXBpL2YxLzIwMTYvZHJpdmVyU3RhbmRpbmdzLmpzb24nLFxuICAgICAgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgc3RvcmUuc3RhbmRpbmdzQXJyYXkgPSByZXNwb25zZS5NUkRhdGEuU3RhbmRpbmdzVGFibGUuU3RhbmRpbmdzTGlzdHNbMF0uRHJpdmVyU3RhbmRpbmdzO1xuICAgICAgICBzZWN0aW9ucy5jcmVhdGVTdGFuZGluZ3NMaXN0KCk7XG4gICAgICB9XG4gICAgKTtcbiAgfSxcblxuICBnZXRSYWNlRHJpdmVyczogZnVuY3Rpb24oKSB7IC8vIFJlcXVlc3QgcmFjZSBkcml2ZXJzIC5qc29uXG4gICAgdGhpcy5kb1JlcXVlc3QoXG4gICAgICAnaHR0cDovL2VyZ2FzdC5jb20vYXBpL2YxLzIwMTYvZHJpdmVycy5qc29uJywgLy8gdXJsXG4gICAgICBmdW5jdGlvbihyZXNwb25zZSkgeyAvLyBjYWxsYmFja0Z1bmN0aW9uXG4gICAgICAgIHNlY3Rpb25zLmNyZWF0ZURyaXZlcnNMaXN0KHJlc3BvbnNlLk1SRGF0YS5Ecml2ZXJUYWJsZS5Ecml2ZXJzKTtcbiAgICAgIH1cbiAgICApO1xuICB9LFxuXG4gIGdldFJhY2VTY2hlZHVsZTogZnVuY3Rpb24oKSB7IC8vIFJlcXVlc3QgdGhlIHJhY2Ugc2NoZWR1bGUgZm9yIHRoZSB1cGNvbWluZyBzZWFzb24gLmpzb25cbiAgICB0aGlzLmRvUmVxdWVzdChcbiAgICAgICdodHRwOi8vZXJnYXN0LmNvbS9hcGkvZjEvMjAxNy5qc29uJyxcbiAgICAgIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIHNlY3Rpb25zLmNyZWF0ZVJhY2VTY2hlZHVsZShyZXNwb25zZS5NUkRhdGEuUmFjZVRhYmxlLlJhY2VzKTtcbiAgICAgIH1cbiAgICApO1xuICB9LFxuXG5cbiAgZG9SZXF1ZXN0OiBmdW5jdGlvbih1cmwsIGNhbGxiYWNrRnVuY3Rpb24pIHsgLy8gWExNSHR0cFJlcXVlc3Qgd2l0aCBkaWZmZXJlbnQgLmpzb24gdXJsIGFzIHBhcmFtZXRlclxuICAgIHNlY3Rpb25zLnRvZ2dsZVNwaW5uZXIoKTtcbiAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXNwb25zZSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSk7XG5cbiAgICAgIGNhbGxiYWNrRnVuY3Rpb24ocmVzcG9uc2UpO1xuICAgICAgc2VjdGlvbnMudG9nZ2xlU3Bpbm5lcigpOyAvLyBUb2dnbGUgdGhlIHNwaW5uZXIgZXZlcnl0aW1lIHlvdSBkbyB0aGUgcmVxdWVzdFxuICAgIH0pO1xuICAgIHJlcXVlc3Quc2VuZCgpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XG4iLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpO1xudmFyIHNlY3Rpb25zID0gcmVxdWlyZSgnLi9zZWN0aW9ucycpO1xudmFyIHJvdXRpZSA9IHJlcXVpcmUoJy4vcm91dGllLmpzJylcblxudmFyIHJvdXRlcyA9IHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgcm91dGllKHtcbiAgICAgICcnOiBmdW5jdGlvbigpIHsgLy8gU2hvdyBzdGFuZGluZyB3aGVuIGZpcnN0IHJlcXVlc3QgaXMgZmlyZWRcbiAgICAgICAgcmVxdWVzdC5nZXREcml2ZXJTdGFuZGluZ3MoKTtcbiAgICAgIH0sXG4gICAgICAnc3RhbmRpbmdzJzogZnVuY3Rpb24oKSB7IC8vIFNhbWUgYXMgYWJvdmUgYnV0IG5vdCB0aGUgYnJvd3NlciBkb2Vzbid0IHJlbG9hZFxuICAgICAgICByZXF1ZXN0LmdldERyaXZlclN0YW5kaW5ncygpO1xuICAgICAgfSxcbiAgICAgICdkcml2ZXJzJzogZnVuY3Rpb24oKSB7IC8vIERyaXZlcnMgb3ZlcnZpZXdcbiAgICAgICAgcmVxdWVzdC5nZXRSYWNlRHJpdmVycygpO1xuICAgICAgfSxcbiAgICAgICdkcml2ZXIvOmlkJzogZnVuY3Rpb24oaWQpIHsgLy8gRHJpdmVycyBkZXRhaWxcbiAgICAgICAgc2VjdGlvbnMuY3JlYXRlRHJpdmVyT3ZlcmxheShpZCk7XG4gICAgICB9LFxuICAgICAgJ3JhY2VzJzogZnVuY3Rpb24oKSB7IC8vIFJhY2Ugc2NoZWR1bGVcbiAgICAgICAgcmVxdWVzdC5nZXRSYWNlU2NoZWR1bGUoKTtcbiAgICAgIH1cbiAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcm91dGVzO1xuIiwidmFyIFJvdXRpZSA9IGZ1bmN0aW9uKHcsIGlzTW9kdWxlKSB7XG5cbiAgdmFyIHJvdXRlcyA9IFtdO1xuICB2YXIgbWFwID0ge307XG4gIHZhciByZWZlcmVuY2UgPSBcInJvdXRpZVwiO1xuICB2YXIgb2xkUmVmZXJlbmNlID0gd1tyZWZlcmVuY2VdO1xuXG4gIHZhciBSb3V0ZSA9IGZ1bmN0aW9uKHBhdGgsIG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5rZXlzID0gW107XG4gICAgdGhpcy5mbnMgPSBbXTtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xuICAgIHRoaXMucmVnZXggPSBwYXRoVG9SZWdleHAodGhpcy5wYXRoLCB0aGlzLmtleXMsIGZhbHNlLCBmYWxzZSk7XG5cbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUuYWRkSGFuZGxlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdGhpcy5mbnMucHVzaChmbik7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnJlbW92ZUhhbmRsZXIgPSBmdW5jdGlvbihmbikge1xuICAgIGZvciAodmFyIGkgPSAwLCBjID0gdGhpcy5mbnMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB2YXIgZiA9IHRoaXMuZm5zW2ldO1xuICAgICAgaWYgKGZuID09IGYpIHtcbiAgICAgICAgdGhpcy5mbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYyA9IHRoaXMuZm5zLmxlbmd0aDsgaSA8IGM7IGkrKykge1xuICAgICAgdGhpcy5mbnNbaV0uYXBwbHkodGhpcywgcGFyYW1zKTtcbiAgICB9XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0aCwgcGFyYW1zKXtcbiAgICB2YXIgbSA9IHRoaXMucmVnZXguZXhlYyhwYXRoKTtcblxuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG5cbiAgICBmb3IgKHZhciBpID0gMSwgbGVuID0gbS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGtleSA9IHRoaXMua2V5c1tpIC0gMV07XG5cbiAgICAgIHZhciB2YWwgPSAoJ3N0cmluZycgPT0gdHlwZW9mIG1baV0pID8gZGVjb2RlVVJJQ29tcG9uZW50KG1baV0pIDogbVtpXTtcblxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB0aGlzLnBhcmFtc1trZXkubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgICBwYXJhbXMucHVzaCh2YWwpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS50b1VSTCA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICAgIGZvciAodmFyIHBhcmFtIGluIHBhcmFtcykge1xuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgnLzonK3BhcmFtLCAnLycrcGFyYW1zW3BhcmFtXSk7XG4gICAgfVxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLzouKlxcPy9nLCAnLycpLnJlcGxhY2UoL1xcPy9nLCAnJyk7XG4gICAgaWYgKHBhdGguaW5kZXhPZignOicpICE9IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgcGFyYW1ldGVycyBmb3IgdXJsOiAnK3BhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcblxuICB2YXIgcGF0aFRvUmVnZXhwID0gZnVuY3Rpb24ocGF0aCwga2V5cywgc2Vuc2l0aXZlLCBzdHJpY3QpIHtcbiAgICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkgcmV0dXJuIHBhdGg7XG4gICAgaWYgKHBhdGggaW5zdGFuY2VvZiBBcnJheSkgcGF0aCA9ICcoJyArIHBhdGguam9pbignfCcpICsgJyknO1xuICAgIHBhdGggPSBwYXRoXG4gICAgICAuY29uY2F0KHN0cmljdCA/ICcnIDogJy8/JylcbiAgICAgIC5yZXBsYWNlKC9cXC9cXCgvZywgJyg/Oi8nKVxuICAgICAgLnJlcGxhY2UoL1xcKy9nLCAnX19wbHVzX18nKVxuICAgICAgLnJlcGxhY2UoLyhcXC8pPyhcXC4pPzooXFx3KykoPzooXFwoLio/XFwpKSk/KFxcPyk/L2csIGZ1bmN0aW9uKF8sIHNsYXNoLCBmb3JtYXQsIGtleSwgY2FwdHVyZSwgb3B0aW9uYWwpe1xuICAgICAgICBrZXlzLnB1c2goeyBuYW1lOiBrZXksIG9wdGlvbmFsOiAhISBvcHRpb25hbCB9KTtcbiAgICAgICAgc2xhc2ggPSBzbGFzaCB8fCAnJztcbiAgICAgICAgcmV0dXJuICcnICsgKG9wdGlvbmFsID8gJycgOiBzbGFzaCkgKyAnKD86JyArIChvcHRpb25hbCA/IHNsYXNoIDogJycpICsgKGZvcm1hdCB8fCAnJykgKyAoY2FwdHVyZSB8fCAoZm9ybWF0ICYmICcoW14vLl0rPyknIHx8ICcoW14vXSs/KScpKSArICcpJyArIChvcHRpb25hbCB8fCAnJyk7XG4gICAgICB9KVxuICAgICAgLnJlcGxhY2UoLyhbXFwvLl0pL2csICdcXFxcJDEnKVxuICAgICAgLnJlcGxhY2UoL19fcGx1c19fL2csICcoLispJylcbiAgICAgIC5yZXBsYWNlKC9cXCovZywgJyguKiknKTtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cCgnXicgKyBwYXRoICsgJyQnLCBzZW5zaXRpdmUgPyAnJyA6ICdpJyk7XG4gIH07XG5cbiAgdmFyIGFkZEhhbmRsZXIgPSBmdW5jdGlvbihwYXRoLCBmbikge1xuICAgIHZhciBzID0gcGF0aC5zcGxpdCgnICcpO1xuICAgIHZhciBuYW1lID0gKHMubGVuZ3RoID09IDIpID8gc1swXSA6IG51bGw7XG4gICAgcGF0aCA9IChzLmxlbmd0aCA9PSAyKSA/IHNbMV0gOiBzWzBdO1xuXG4gICAgaWYgKCFtYXBbcGF0aF0pIHtcbiAgICAgIG1hcFtwYXRoXSA9IG5ldyBSb3V0ZShwYXRoLCBuYW1lKTtcbiAgICAgIHJvdXRlcy5wdXNoKG1hcFtwYXRoXSk7XG4gICAgfVxuICAgIG1hcFtwYXRoXS5hZGRIYW5kbGVyKGZuKTtcbiAgfTtcblxuICB2YXIgcm91dGllID0gZnVuY3Rpb24ocGF0aCwgZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFkZEhhbmRsZXIocGF0aCwgZm4pO1xuICAgICAgcm91dGllLnJlbG9hZCgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIHAgaW4gcGF0aCkge1xuICAgICAgICBhZGRIYW5kbGVyKHAsIHBhdGhbcF0pO1xuICAgICAgfVxuICAgICAgcm91dGllLnJlbG9hZCgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcm91dGllLm5hdmlnYXRlKHBhdGgpO1xuICAgIH1cbiAgfTtcblxuICByb3V0aWUubG9va3VwID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMgPSByb3V0ZXMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB2YXIgcm91dGUgPSByb3V0ZXNbaV07XG4gICAgICBpZiAocm91dGUubmFtZSA9PSBuYW1lKSB7XG4gICAgICAgIHJldHVybiByb3V0ZS50b1VSTChvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICByb3V0aWUucmVtb3ZlID0gZnVuY3Rpb24ocGF0aCwgZm4pIHtcbiAgICB2YXIgcm91dGUgPSBtYXBbcGF0aF07XG4gICAgaWYgKCFyb3V0ZSlcbiAgICAgIHJldHVybjtcbiAgICByb3V0ZS5yZW1vdmVIYW5kbGVyKGZuKTtcbiAgfTtcblxuICByb3V0aWUucmVtb3ZlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgbWFwID0ge307XG4gICAgcm91dGVzID0gW107XG4gIH07XG5cbiAgcm91dGllLm5hdmlnYXRlID0gZnVuY3Rpb24ocGF0aCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBzaWxlbnQgPSBvcHRpb25zLnNpbGVudCB8fCBmYWxzZTtcblxuICAgIGlmIChzaWxlbnQpIHtcbiAgICAgIHJlbW92ZUxpc3RlbmVyKCk7XG4gICAgfVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IHBhdGg7XG5cbiAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBhZGRMaXN0ZW5lcigpO1xuICAgICAgICB9LCAxKTtcbiAgICAgIH1cblxuICAgIH0sIDEpO1xuICB9O1xuXG4gIHJvdXRpZS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgd1tyZWZlcmVuY2VdID0gb2xkUmVmZXJlbmNlO1xuICAgIHJldHVybiByb3V0aWU7XG4gIH07XG5cbiAgdmFyIGdldEhhc2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuICB9O1xuXG4gIHZhciBjaGVja1JvdXRlID0gZnVuY3Rpb24oaGFzaCwgcm91dGUpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgaWYgKHJvdXRlLm1hdGNoKGhhc2gsIHBhcmFtcykpIHtcbiAgICAgIHJvdXRlLnJ1bihwYXJhbXMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICB2YXIgaGFzaENoYW5nZWQgPSByb3V0aWUucmVsb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhc2ggPSBnZXRIYXNoKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMgPSByb3V0ZXMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB2YXIgcm91dGUgPSByb3V0ZXNbaV07XG4gICAgICBpZiAoY2hlY2tSb3V0ZShoYXNoLCByb3V0ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAody5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICB3LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBoYXNoQ2hhbmdlZCwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3LmF0dGFjaEV2ZW50KCdvbmhhc2hjaGFuZ2UnLCBoYXNoQ2hhbmdlZCk7XG4gICAgfVxuICB9O1xuXG4gIHZhciByZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgIHcucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdy5kZXRhY2hFdmVudCgnb25oYXNoY2hhbmdlJywgaGFzaENoYW5nZWQpO1xuICAgIH1cbiAgfTtcbiAgYWRkTGlzdGVuZXIoKTtcblxuICBpZiAoaXNNb2R1bGUpe1xuICAgIHJldHVybiByb3V0aWU7XG4gIH0gZWxzZSB7XG4gICAgd1tyZWZlcmVuY2VdID0gcm91dGllO1xuICB9XG5cbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICd1bmRlZmluZWQnKXtcbiAgUm91dGllKHdpbmRvdyk7XG59IGVsc2Uge1xuICBtb2R1bGUuZXhwb3J0cyA9IFJvdXRpZSh3aW5kb3csdHJ1ZSk7XG59XG4iLCJ2YXIgc3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBzZWN0aW9ucyA9IHtcblxuICBjcmVhdGVTdGFuZGluZ3NMaXN0OiBmdW5jdGlvbihzb3J0KSB7XG4gICAgdmFyIGRhdGFBcnJheSA9IHN0b3JlLnN0YW5kaW5nc0FycmF5O1xuXG4gICAgLy8gTUROIGV4YW1wbGU7XG4gICAgaWYoc29ydCA9PT0gJ2FsZmFiZXRpYycpIHsgLy8gU29ydCBhbGZhYmV0aWNcbiAgICAgIGRhdGFBcnJheSA9IGRhdGFBcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgdmFyIG5hbWVBID0gYS5Ecml2ZXIuZ2l2ZW5OYW1lLnRvVXBwZXJDYXNlKCk7IC8vIFNvcnRpbmcgYmFzZWQgb24gdGhlIGdpdmVuIG5hbWVcbiAgICAgICAgdmFyIG5hbWVCID0gYi5Ecml2ZXIuZ2l2ZW5OYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIGlmIChuYW1lQSA8IG5hbWVCKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuYW1lQSA+IG5hbWVCKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBuYW1lcyBhcmUgZXF1YWxcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBkYXRhQXJyYXkgPSBkYXRhQXJyYXkuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBOdW1iZXIoYS5wb3NpdGlvbikgLSBOdW1iZXIoYi5wb3NpdGlvbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlzdCcpLmlubmVySFRNTCA9IFwiIFwiO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zb3J0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNvcnQnKS5pbm5lckhUTUwgKz0gYFxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJub3JtYWxcIj4g4qyH77iPIFBvc2l0aW9uPC9saT5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYWxmYWJldGljXCI+8J+FsO+4jyBBbGZhYmV0aWM8L2xpPmA7IC8vIE9ubHkgc2hvdyB0aGVzZSBsaXN0IGl0ZW1zIGlmIHJhY2Ugc2NoZWR1bGUgaXMgYWN0aXZlXG5cbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubm9ybWFsJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHsgLy8gV2hlbiBub3JtYWwgY2xpY2ssIG5vcm1hbCBsaXN0XG4gICAgICBzZWN0aW9ucy5jcmVhdGVTdGFuZGluZ3NMaXN0KCk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFsZmFiZXRpYycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7IC8vIFdoZW4gYWxmYWJldGljIGNsaWNrLCBub3JtYWwgbGlzdFxuICAgICAgc2VjdGlvbnMuY3JlYXRlU3RhbmRpbmdzTGlzdCgnYWxmYWJldGljJyk7XG4gICAgfSk7XG5cbiAgICBkYXRhQXJyYXkuZm9yRWFjaChmdW5jdGlvbihzdGFuZGluZykgeyAvLyBHZW5lcmF0ZSBsaXN0IGl0ZW1zXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlzdCcpLmlubmVySFRNTCArPSBgXG4gICAgICA8bGk+XG4gICAgICAgIDxoMj4ke3N0YW5kaW5nLnBvc2l0aW9ufS48L2gyPlxuICAgICAgICA8cD4gfCA8L3A+XG4gICAgICAgIDxoMz4ke3N0YW5kaW5nLnBvaW50c308L2gzPlxuICAgICAgICA8cD4ke3N0YW5kaW5nLkRyaXZlci5naXZlbk5hbWV9ICR7c3RhbmRpbmcuRHJpdmVyLmZhbWlseU5hbWV9PC9wPlxuICAgICAgICA8cCBjbGFzcz1cImNvbnN0cnVjdG9yXCI+JHtzdGFuZGluZy5Db25zdHJ1Y3RvcnNbMF0uY29uc3RydWN0b3JJZC5yZXBsYWNlKC9fL2csICcgJyl9PC9wPlxuICAgICAgPC9saT5gO1xuICAgIH0pO1xuICB9LFxuXG4gIGNyZWF0ZURyaXZlcnNMaXN0OiBmdW5jdGlvbihkYXRhQXJyYXkpIHtcbiAgICBzdG9yZS5kcml2ZXJzQXJyYXkgPSBkYXRhQXJyYXk7IC8vIHNhdmUgZm9yIGxhdGVyIHVzZVxuICAgIC8vIEhpZGUgb3RoZXIgbGlzdFxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saXN0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNvcnQnKS5pbm5lckhUTUwgPSBcIiBcIjtcbiAgICAvLyBGaWxsIGxpc3Qgd2l0aCBkYXRhXG4gICAgZGF0YUFycmF5LmZvckVhY2goZnVuY3Rpb24oZHJpdmVyLCBpbmRleCkge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpc3QnKS5pbm5lckhUTUwgKz0gYFxuICAgICAgICA8bGk+XG4gICAgICAgICAgPGEgaHJlZj1cIiNkcml2ZXIvJHtpbmRleH1cIj5cbiAgICAgICAgICAgIDxoMj4ke2RyaXZlci5jb2RlfTwvaDI+XG4gICAgICAgICAgICA8cD4ke2RyaXZlci5naXZlbk5hbWV9ICR7ZHJpdmVyLmZhbWlseU5hbWV9PC9wPlxuICAgICAgICAgIDwvYT5cbiAgICAgICAgPC9saT5cbiAgICAgIGA7XG4gICAgfSk7XG4gIH0sXG5cbiAgY3JlYXRlRHJpdmVyT3ZlcmxheTogZnVuY3Rpb24oaWQpIHsgLy8gQ3JlYXRlIHRoZSBvdmVybGF5XG4gICAgdmFyIGRyaXZlciA9IHN0b3JlLmRyaXZlcnNBcnJheVtpZF07XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBjbGFzcz1cImRpYWxvZ1wiPlxuICAgICAgPHA+Rmlyc3QgbmFtZTogJHtkcml2ZXIuZ2l2ZW5OYW1lfTwvcD5cbiAgICAgIDxwPkxhc3QgbmFtZTogJHtkcml2ZXIuZmFtaWx5TmFtZX08L3A+XG4gICAgICA8cD5OYXRpb25hbGl0eTogJHtkcml2ZXIubmF0aW9uYWxpdHl9PC9wPlxuICAgICAgPHA+RGF0ZSBvZiBCaXJ0aDogJHtkcml2ZXIuZGF0ZU9mQmlydGh9PC9wPlxuICAgICAgPHA+V2lraXBlZGlhOjwvcD5cbiAgICAgIDxhIGhyZWY9XCIke2RyaXZlci51cmx9XCI+JHtkcml2ZXIuY29kZX08L2E+XG4gICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMudG9nZ2xlT3ZlcmxheSgpOyAvLyBUb2dnbGUgdGhlIG92ZXJsYXlcbiAgfSxcblxuICBjcmVhdGVSYWNlU2NoZWR1bGU6IGZ1bmN0aW9uKGRhdGFBcnJheSkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saXN0JykuaW5uZXJIVE1MID0gXCIgXCI7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNvcnQnKS5pbm5lckhUTUwgPSBcIiBcIjtcbiAgICBkYXRhQXJyYXkuZm9yRWFjaChmdW5jdGlvbihyYWNlKSB7XG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlzdCcpLmlubmVySFRNTCArPSBgXG4gICAgICA8bGk+XG4gICAgICAgIDxoMj4ke3JhY2UucmFjZU5hbWV9PC9oMj5cbiAgICAgICAgPHAgY2xhc3M9ZGF0ZT4ke3JhY2UuZGF0ZX08L3A+XG4gICAgICA8L2xpPmA7XG4gICAgfSk7XG4gIH0sXG5cbiAgdG9nZ2xlT3ZlcmxheTogZnVuY3Rpb24oKSB7IC8vIEhpZGUgdGhlIG92ZXJsYXlcbiAgICB2YXIgb3ZlcmxheSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5Jyk7XG4gICAgb3ZlcmxheS5oaWRkZW4gPSAhb3ZlcmxheS5oaWRkZW47XG4gIH0sXG5cbiAgdG9nZ2xlU3Bpbm5lcjogZnVuY3Rpb24oKSB7IC8vIFRvZ2dsZSB0aGUgc3Bpbm5lclxuICAgIHZhciBzcGlubmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnByZWxvYWRlcicpO1xuICAgIHNwaW5uZXIuY2xhc3NMaXN0LnRvZ2dsZSgncHJlbG9hZGVyLWhpZGRlbicpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNlY3Rpb25zO1xuIiwidmFyIGRyaXZlcnNBcnJheSA9IFtdOyAvLyBTdG9yZSBkcml2ZXIgZGF0YVxudmFyIHN0YW5kaW5nc0FycmF5ID0gW107IC8vIFN0b3JlIHN0YW5kaW5nIGRhdGFcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRyaXZlcnNBcnJheTogZHJpdmVyc0FycmF5LFxuICBzdGFuZGluZ3NBcnJheTogc3RhbmRpbmdzQXJyYXlcbn1cbiJdfQ==
