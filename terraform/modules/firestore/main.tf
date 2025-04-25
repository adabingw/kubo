resource "google_firestore_database" "default" {
  name     = "(default)"
  project  = var.project_id
  location_id = var.location
  type     = var.database_type
}
