import json
import requests

INPUT_FILE = '../output/MUNI.json'
OUTPUT_FILE = '../output/MUNI_FIPS.json'

GEOCODING_API_URL = 'http://geoservices.tamu.edu/Services/CensusIntersection/WebService/v04_01/Rest/'

in_f = open(INPUT_FILE)
stops_json = json.load(in_f)
in_f.close()

print stops_json
fips_db = {}

for stop_name in stops_json['stops']:
    stop = stops_json['stops'][stop_name]
    print stop
    print stop['lat'], stop['lon']
    
    if 'Metro Montgomery' in stop_name:
        stop['lat'] = 37.789256 
        stop['lon'] = -122.401407

    if 'Metro Powell' in stop_name:
        stop['lat'] = 37.784991
        stop['lon'] = -122.406857

    params = {
        'apiKey': '4a737e73be544cf19303111386227ee9',
        'version': '4.01',
        'censusYear': 'allAvailable',
        'lat': stop['lat'],
        'lon': stop['lon'],
        's': 'CA',
        'format': 'json'
    }
    r = requests.get(GEOCODING_API_URL, params=params)
    census_json = r.json()

    fips_json = {}
    for record in census_json["CensusRecords"]:
        textCensusYear = record['CensusYear']
        year = None
        if textCensusYear == "NineteenNinety":
            year = 1990
        elif textCensusYear == "TwoThousand":
            year = 2000
        elif textCensusYear == "TwoThousandTen":
            year = 2010

        fips_json[year] = {
            'state_fips': record['CensusStateFips'],
            'county_fips': record['CensusCountyFips'],
            'tract_fips': ''.join([x for x in record['CensusTract'] if x != '.'])
        }

    print fips_json, stop
    fips_db[stop['name']] = fips_json

    print fips_db
    out_f = open(OUTPUT_FILE, "w")
    json.dump(fips_db, out_f)
    out_f.close()
    print "Finished one"

