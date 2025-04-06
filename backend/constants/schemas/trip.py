from schema import Schema, Or
from constants.schemas.main import metadata_schema

stop_schema = Schema({
    "Code": str,
    "Order": int,
    "Time": str,
    "sortingTime": str,
    "IsMajor": bool
})

trip_schema = Schema({
    "Number": str,
    "Display": str,
    "Line": str,
    "Direction": str,
    "LineVariant": str,
    "Type": str,
    "Stops": {
        "Stop": [stop_schema]
    },
    "destinationStopCode": str,
    "departFromCode": str,
    "departFromAlternativeCode": str,
    "departFromTimingPoint": str,
    "tripPatternId": Or(int, str)
})

transfer_schema = Schema({
    "Code": str,
    "Order": int,
    "Time": str
})

transfer_link_schema = Schema({
    "FromTrip": str,
    "FromStopCode": str,
    "ToTrip": str,
    "ToStopCode": str,
    "TransferDuration": str
})

service_schema = Schema({
    "Colour": str,
    "Type": str,
    "Direction": str,
    "Code": str,
    "StartTime": str,
    "EndTime": str,
    "Duration": str,
    "Accessible": "",
    "Trips": {
        "Trip": [trip_schema]
    },
    "Transfers": {
        "Transfer": [transfer_schema]
    },
    "TransferLinks": {
        "Link": [transfer_link_schema]
    },
    "StartSortTime": str,
    "EndSortTime": str,
    "tripHash": str,
    "transferCount": int
})

journey_schema = Schema({
    "Date": str,
    "Time": str,
    "To": str,
    "From": str,
    "Services": Or([service_schema], None)
})

trips_schema = Schema({
    "Metadata": metadata_schema,
    "SchJourneys": [journey_schema]
})
