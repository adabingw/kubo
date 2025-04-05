from schema import Schema, Or

metadata_schema = Schema({
    "TimeStamp": str,  # Fixed capitalization to match your data
    "ErrorCode": str,
    "ErrorMessage": str
})
