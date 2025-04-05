from schema import Schema, Or
from constants.schemas.main import metadata_schema

line_schema = Schema({
    "Code": str
})

stops_schema = Schema({
    "Name": Or(str, None),
    "Code": str,
})

message_schema = Schema({
    "Code": str,
    "ParentCode": Or(str, None),
    "Status": str,
    "PostedDateTime": str,
    "SubjectEnglish": str,
    "SubjectFrench": str,
    "BodyEnglish": str,
    "BodyFrench": Or(str, None),
    "Category": str,
    "SubCategory": str,
    "Lines": [line_schema],
    "Stops": [stops_schema],
    "Trips": []
})

alert_schema = Schema({
    "Metadata": metadata_schema,
    "Messages": Or({
        "Message": [message_schema]
    }, None)
})
