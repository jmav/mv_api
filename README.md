mv_api
======

Mountvacation JSON datasets update scripts.

### Installation

	npm install
	
Then copy/create config.js file.


### Run web API server

	node app-country-index.js
	
### Web console
JSON files can be manually updated over web interface. To access IF you need to open browser on address: **localhost:3001**


### Update js files from command line
Example:

    node app-country-index.js -p info -s test1
    
**Parameters**

*	p: path (countries, resorts, resortsIndexNew, info, forecast, accShortDesc)
*	s: server (live, test, test1)



# Sitemap generator (app)
Used for updating sitemap.xml files on MV live server

### Update all sitemaps
This app doesn't have web interface and it only updates live site files.

	node app-sitemapgen.js
