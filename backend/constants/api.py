from dotenv import load_dotenv 
from constants.goApiSchema import next_service_schema
import requests
import os
import logging

# Load environment variables from .env file
load_dotenv()
logging.basicConfig(level=logging.DEBUG)

GOAPI_KEY = os.getenv('GOAPI_KEY')
GOAPI_URL = os.getenv('GOAPI_URL')

QUERY_ALL_STOPS = { 'endpoint': '/api/V1/Stop/All'}
QUERY_NEXT_SERVICE = { 'endpoint': '/api/V1/Stop/NextService/{}', 'schema': next_service_schema} # LocationCode
QUERY_STOP_DESTINATIONS = '/api/V1/Stop/Destinations/{}/{}/{}' # StopCode, FromTime, ToTime
QUERY_SERVICE_UPDATES = '/api/V1/ServiceUpdate/ServiceAlert/All'
QUERY_INFO_UPDATES = '/api/V1/ServiceUpdate/InformationAlert/All'
QUERY_EXCEPTIONS = '/api/V1/ServiceUpdate/Exceptions/All'

def request(query, payload):
    url = f"{GOAPI_URL}{query['endpoint'].format(*payload)}?key={GOAPI_KEY}"
    logging.debug(url)
    x = requests.get(url).json()
    logging.debug(x)
    if query['schema']:
        logging.debug(f"Schema: {query['schema']}")
        valid = query['schema'].is_valid(x)
        if not valid:
            logging.debug('Is not valid data')
            return None
    logging.debug(x)
    return x

if __name__ == "__main__":
    request(QUERY_ALL_STOPS, [])
