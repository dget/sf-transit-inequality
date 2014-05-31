Inequality & Mass Transit in the Bay Area
=====================

This is a mashup to overlay demographic info with the all the major mass transit routes in the San Francisco Bay Area.

This **master** branch you’re looking at has the Python code used to generate the data files used by the visualization.. The visualization itself is in the **gh-pages** branch.

### Modifying for other cities and demographic data
To generate the JSON file that the mashup reads data from, run grab_routes.py.

To change it to graph another city, change ALL_GTFS_PATHS in config.py to point to other GTFS feeds available from the transit agency of your choice. 

To graph other dimensions, change the MEDIAN_INCOME_TABLE_NAME constant in config.py to some other American Community Survey column name. A list of column names is on p45 of [this PDF](http://www2.census.gov/acs2012_5yr/summaryfile/ACS_2008-2012_SF_Tech_Doc.pdf). Also, be sure to use your own API key!



### Python Requirements
 * [census](https://github.com/sunlightlabs/census)
 * [requests](http://docs.python-requests.org/en/latest/)
 * [transitfeed](https://code.google.com/p/googletransitdatafeed/wiki/TransitFeed) 
