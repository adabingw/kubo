variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "location" {
  type        = string
  description = "Location of Firestore (e.g. us-central)"
}

variable "database_type" {
  type        = string
  description = "FIRESTORE_NATIVE or DATASTORE_MODE"

  validation {
    condition     = contains(["FIRESTORE_NATIVE", "DATASTORE_MODE"], var.database_type)
    error_message = "database_type must be FIRESTORE_NATIVE or DATASTORE_MODE"
  }
}
