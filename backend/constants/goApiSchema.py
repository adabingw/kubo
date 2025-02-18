from schema import Schema, Or

metadata_schema = Schema({
    "TimeStamp": str,  # Fixed capitalization to match your data
    "ErrorCode": str,
    "ErrorMessage": str
})

line_schema = Schema({
    "StopCode": Or(str, int),
    "LineCode": str,
    "LineName": str,
    "ServiceType": str,
    "DirectionCode": str,
    "DirectionName": str,
    "ScheduledDepartureTime": str,
    "ComputedDepartureTime": Or(str, None),
    "DepartureStatus": str,
    "ScheduledPlatform": str,
    "ActualPlatform": str,
    "TripOrder": int,
    "TripNumber": str,
    "UpdateTime": str,
    "Status": str,
    "Latitude": float,
    "Longitude": float
})

next_service_schema = Schema({
    "Metadata": metadata_schema,
    "NextService": {
        "Lines": [line_schema]  # Ensures each element in `Lines` follows `line_schema`
    }
})
