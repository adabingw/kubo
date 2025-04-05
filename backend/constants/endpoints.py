from constants.schemas.next_service import next_service_schema
from constants.schemas.alerts import alert_schema
from constants.schemas.exceptions import exception_schema

QUERY_NEXT_SERVICE = { 
    'endpoint': '/api/V1/Stop/NextService/{stopCode}', #LocationCode
    'schema': next_service_schema
}

QUERY_STOP_DESTINATIONS = '/api/V1/Stop/Destinations/{stopCode}/{from}/{to}' # StopCode, FromTime, ToTime

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
