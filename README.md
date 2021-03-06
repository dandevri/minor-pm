# Formula 1 - Dashboard 🏎

![GitHub Banner](github/github_banner.png)

## 📖 Introduction
This Formula 1 Dashboard SPA shows you the the latest statistics about:

* Driver standings
* Drivers
* Race schedule

The upcoming Formula 1 season (2017) is right around the corner. To give race fanatics and Max Verstappen fans insight in the upcoming season is why I build this app. Through the menu you can navigate to the different sections with every page showing different statistics. You can even sort race drivers by name.


### Job Story

> When a race fanatic comes home from work with no internet connection (for example; by train) I want them to look at the upcoming race schedule so they can get ready for the upcoming race.

## ⚙ Installation & Development

### Built With
* `express`: Web application framework used for basic routing
* `request:` To make http calls
* `ejs`: Client side templating engine
* `ergast developer api`: [Formula 1 API](http://ergast.com/mrd/) (returns .json)


### Run

To run this project locally:

1. Clone the repo to your computer and `change directory` into the folder.  
```
$ git clone https://github.com/nickrttn/performance-matters && cd minor-pm
```

2. Install the dependencies
```
$ npm install
```

3. Start the server
```
$ npm start
```
You should see the following message:
> The server is running on: http://localhost:1337

4. Expose the server
```
$ npm run expose
```
> You can than run it trough pagespeed with the url provided by ngrok.

5. For environment variables you'll need to create a `.env` file in the `root directory`. Put the following variables into the file:

```
API_URL_DRIVERSTANDINGS=http://ergast.com/api/f1/2016/driverStandings.json

API_URL_RACEDRIVERS=http://ergast.com/api/f1/2016/drivers.json

API_URL_RACESCHEDULE=http://ergast.com/api/f1/2017.json
```

:tada: Great success!

## ⚡️Performance
* I've compressed most images using [`sketch image compressor`](https://github.com/BohemianCoding/sketch-image-compressor) and used inline svg with the data uri.
* With [`npm compression`](https://www.npmjs.com/package/compression) I enabled Gzip compression.
* With [`browserify`](http://browserify.org/) and [`UglifyJS`](https://github.com/mishoo/UglifyJS) I've bundled and minified the JavaScript file.
* Used [`cleanCSS`](https://github.com/jakubpawlowicz/clean-css) to minify the CSS.

## Wishlist
* [ ] Implement service worker

## Contributing
* For commit messages: [GitMoji]() is used.
* Follows Necolas' Idiomatic-CSS principles [Idiomatic CSS](https://github.com/necolas/idiomatic-css)

## Versioning
Please refer to [SemVer](http://semver.org/) to read more about versioning.

## Acknowledgements
* Tutus Wormer *@wooorm* to have a shoulder to cry on.
* Joost Faber *@joostf* for mental support.
* My parents for cooking dinner everytime I came home after a long day of work.

## License

Licensed under MIT

© *Danny de Vries | 2017*
