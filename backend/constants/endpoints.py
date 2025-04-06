from constants.schemas.next_service import next_service_schema
from constants.schemas.alerts import alert_schema
from constants.schemas.exceptions import exception_schema
from constants.schemas.trip import trips_schema

QUERY_NEXT_SERVICE = { 
    'endpoint': '/api/V1/Stop/NextService/{stopCode}', #LocationCode
    'schema': next_service_schema
}

QUERY_TRIP = {
    'endpoint': '/api/V1/Schedule/Journey/{date}/{from}/{to}/{time}/5',
    'schema': trips_schema
}

QUERY_SERVICE_ALERTS = { 
    'endpoint': '/api/V1/ServiceUpdate/ServiceAlert/All',
    'schema': alert_schema
}

QUERY_INFO_ALERTS = {
    'endpoint': '/api/V1/ServiceUpdate/InformationAlert/All',
    'schema': alert_schema
}

QUERY_EXCEPTIONS = {
    'endpoint': '/api/V1/ServiceUpdate/Exceptions/All',
    'schema': exception_schema
}
