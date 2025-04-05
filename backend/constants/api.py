from dotenv import load_dotenv 
import requests
import os
import logging

# Load environment variables from .env file
load_dotenv()
logging.basicConfig(level=logging.DEBUG)

GOAPI_KEY = os.getenv('GOAPI_KEY')
GOAPI_URL = os.getenv('GOAPI_URL')

def request(query, payload):
    url = f"{GOAPI_URL}{query['endpoint'].format(**payload)}?key={GOAPI_KEY}"
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

