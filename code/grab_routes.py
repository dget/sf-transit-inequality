import json
import os
import transitfeed
import census
import requests

from config import *

# This script builds a JSON file containing a transit systems 
# routes coupled with census data. Uses GTFS feeds and the census API.

census_api = census.Census(CENSUS_API_KEY, year=2000)

# Helper to call an FCC API to grab the correct census tract for a given lat/lon.
def get_fips(latitude, longitude, year="2010"):
	r = requests.get("http://data.fcc.gov/api/block/%s/find?format=json&latitude=%f&longitude=%f&showall=true" % (year, latitude, longitude))
	return r.json()

fips_dict = {}
def build_fips_dict():
    for agency in FIPS_JSON_FILE:
        agency_filename = FIPS_JSON_FILE[agency]

        agency_file = open(agency_filename)
        agency_json = json.load(agency_file)

        fips_dict.update(agency_json)

    return fips_dict

build_fips_dict()

def get_fips_from_stop(stop, year="2010"):
	fips_info = fips_dict[stop][year]

	return fips_info

# Source: www.usinflationcalendar.com CPI-U
CPI = {
    1989: 124.0,
    1999: 166.6,
    2009: 214.537,
    2013: 232.957
}

def standardize_median_income(income, source_year, target_year):
    return income * (CPI[target_year] / CPI[source_year])

# Make a file for each agency covered 
for agency_name, path in ALL_GTFS_PATHS.iteritems():
	print "Starting %s" % agency_name
	agency_json = {"agency_name":agency_name, "stops":{}, "routes":{}}

	is_muni = (agency_name == "MUNI")

	schedule = transitfeed.schedule.Schedule()
	schedule.Load(path)
	routes = schedule.GetRouteList()
	trips = schedule.GetTripList()
	stops = schedule.GetStopList()

	stop_ids_to_use = set() # Don't grab census info for stops on routes we're ignoring

	# Build route list
	for r in routes:
		if is_muni: # 
			#Skip bus lines that we decided not to count
			if (not r.route_type == 0) and not r.route_short_name in MUNI_ALLOWED_ROUTE_SHORT_NAMES:
				print "Skipping non-train route %s" % r
				continue

			# Normalize their route names
			route_name = r.route_short_name + " " + r.route_long_name
		else:
			route_name = r.route_long_name

		# Get an ordered list of stops by looking at this route's "trips."
		# Some of them will be limited runs, so we want to pick the trip that covers
		# the most stops, and use that to represent the route.
		route_trips = filter(lambda t: t.route_id == r.route_id, trips)
		if len(route_trips) == 0:
			continue

		trips_sorted = sorted(route_trips, lambda a, b: cmp(a.GetCountStopTimes(), b.GetCountStopTimes()), reverse=True)
		stop_ids_in_order = map(lambda st: st.stop_id, trips_sorted[0].GetStopTimes())
		stop_ids_to_use.update(stop_ids_in_order)

		route_json = {"name":route_name, "stop_ids":stop_ids_in_order}
		agency_json["routes"][r.route_id] = route_json

	
	#  Build stop list, look up related info
	for s in stops:
		if not s.stop_id in stop_ids_to_use:
			continue

		# Get FIPS info from the FCC API, separate it out
		try:
			stop_json = {
				"lat":s.stop_lat, 
				"lon":s.stop_lon, 
				"name":s.stop_name,
				"median_income": {},
				"fips_info": {}
				}

			print s.stop_name
			for year in ["1990", "2000", "2010"]:
				fips_info = get_fips_from_stop(s.stop_name, year=year)

				state_fips = fips_info['state_fips']
				county_fips = fips_info['county_fips']
				tract_fips = fips_info['tract_fips']

				stop_json["fips_info"][year] = fips_info

				# Look up census info
				median_income_table_name = MEDIAN_INCOME_TABLE_NAMES[year]

				# We need to use ACS for 2010 since Census API doesn't have it for SF3
				if year != "2010":
					if year == "1990" and tract_fips[4:6] == "00":
						tract_fips = tract_fips[0:4]
					response = census_api.sf3.state_county_tract(median_income_table_name, state_fips, county_fips, tract_fips, year=year)
				else:
					response = census_api.acs.state_county_tract(median_income_table_name, state_fips, county_fips, tract_fips, year=year)

				median_income = response[0][median_income_table_name]
				median_income = int(median_income) if (median_income and median_income != 'null') else 0
				if median_income: 
					print "%s...$%d" % (year,median_income)

				inflation_year = int(year) - 1  # Census always uses the year before's CPI
				print inflation_year
				stop_json["median_income"][year] = standardize_median_income(median_income, inflation_year, 2013)

			agency_json["stops"][s.stop_id] = stop_json


		except Exception, e:
			print "Skipping stop due to exception: %s" % e
			import sys
			import traceback
			traceback.print_tb(sys.exc_info()[2])
			raise e

	# Output as JSON
	print "Writing..."
	output_path = os.path.join(OUTPUT_DIR,"%s.json" % agency_name)
	output_file = open(output_path, "wb")
	output_file.write(json.dumps(agency_json))
	output_file.close()
	
