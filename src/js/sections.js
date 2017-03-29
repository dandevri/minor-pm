var store = require('./store');

var sections = {
  clearList: function() {
    var list = document.querySelecgit tor('body > section');
    if (list) {
      list.parentNode.removeChild(list);
    }
  },

  createStandingsList: function(sort) {
    this.clearList();
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
    this.clearList();
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
    this.clearList();
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
    this.clearList();
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
