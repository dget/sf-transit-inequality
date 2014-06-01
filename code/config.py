import os

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
OUTPUT_DIR = SCRIPT_DIR+"/../output"

ALL_GTFS_PATHS = {"BART": SCRIPT_DIR+"/../data/bart",
			 	 "CalTrain": SCRIPT_DIR+"/../data/caltrain",
			 	 "MUNI": SCRIPT_DIR+"/../data/muni"
         }

FIPS_JSON_FILE = {
    "BART": SCRIPT_DIR + "/../output/BART_FIPS.json",
    "CalTrain": SCRIPT_DIR + "/../output/CalTrain_FIPS.json",
    "MUNI": SCRIPT_DIR + "/../output/MUNI_FIPS.json"
}

# Census
CENSUS_API_KEY = "4b415bf262765d14f4c2f534ce3b5f0a4237d980"
MEDIAN_INCOME_TABLE_NAMES = {
  "2010": 'B19013_001E',
  "2000": 'P053001',
  "1990": 'P080A001'
}

# Skip some MUNI bus routes
MUNI_ALLOWED_ROUTE_SHORT_NAMES = ["49", "30", "38", "22", "1", "14", "5", "9", "47", "31", "8X", "19"]
