from schema import Schema, Or
from constants.schemas.main import metadata_schema

stop_schema = Schema({
    "Order": int,
    "ID": str,
    "SchArrival": Or(str, None),
    "SchDeparture": Or(str, None),
    "Name": str,
    "IsStopping": str,
    "IsCancelled": str,
    "IsOverride": str,
    "Code": str,
    "ActualTime": Or(str, None),
    "ServiceType": str
})

trip_schema = Schema({
    "TripNumber": str,
    "TripName": str,
    "IsCancelled": str,
    "IsOverride": str,
    "Stop": [stop_schema]
})

exception_schema = Schema({
    "Metadata": metadata_schema,
    "Trip": [trip_schema]
})
