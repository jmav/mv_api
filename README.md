mv_infra
======

Mountvacation JSON datasets update scripts.

## Installation

	npm install
	
Then copy/create config.js file.


## Run web API server (Legacy)

	node app-country-index.js
	
## Web console (Legacy)
JSON files can be manually updated over web interface. To access IF you need to open browser on address: **localhost:3001**

## Controllers

Each controller generates specific dataset.

### Countries
Generate country JSON object in file `data-countries.js`

### Regions
Generate country JSON object in file `data-codes-lang.js`.

Each language is in separate file. This was started with intension to move each dataset in one file.

### Resorts
Generate country JSON object in file `data-resorts.js`


## Update js files from command line
Example:

	node app-data.js -c countries
	node app-data.js -c regions
	node app-data.js -c resorts

Example (Legacy) 

    node app-country-index.js -p info -s test1
    
**Parameters**

- **c** controller (countries, regions, resorts)

**Parameters (Legacy)**

- **p** path (countries, resorts, resortsIndexNew, info, forecast, accShortDesc)
- **s** server (live, test, test1)


# Sitemap generator (app)
Used for updating sitemap.xml files on MV live server

## Update all sitemaps
This app doesn't have web interface and it only updates live site files.

	node app-sitemapgen.js
