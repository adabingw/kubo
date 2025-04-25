resource "google_project_service" "pubsub" {
  service = "pubsub.googleapis.com"
  project = var.project_id
}
