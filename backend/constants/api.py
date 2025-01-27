import http.client
from dotenv import load_dotenv 
import os

# Load environment variables from .env file
load_dotenv()

RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST')

conn = http.client.HTTPSConnection(RAPIDAPI_HOST)
headers = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST
}


QUERY_HOTEL_DESTINATION = {
    'method': 'GET',
    'endpoint': '/api/v1/hotels/searchDestination?query={}'
}

QUERY_FLIGHT_DESTINATION = {
    'method': 'GET',
    'endpoint': '/api/v1/flights/searchDestination?query={}'
}

QUERY_FLIGHT = {
    'method': 'GET',
    'endpoint': '/api/v1/flights/searchFlights?fromId={}&toId={}&pageNo=1&adults={}&departDate={}&sort=BEST&cabinClass=ECONOMY&currency_code=USD'
}

QUERY_FLIGHT_DETAILS = {
    'method': 'GET',
    'endpoint': '/api/v1/flights/getFlightDetails?token={}'
}

def request(endpoint, payload):
    conn.request(endpoint['method'], endpoint['endpoint'].format(*payload), headers=headers)

    res = conn.getresponse()
    data = res.read()

    print(data.decode("utf-8"))
    return data.decode("utf-8")
