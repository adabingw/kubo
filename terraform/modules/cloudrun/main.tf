resource "google_cloud_run_service" "default" {
  name     = var.name
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = var.image
        resources {
          limits = {
            memory = var.memory
            cpu    = var.cpu
          }
        }
      }

      service_account_name = var.service_account
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = var.max_scale
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service_iam_member" "invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  service  = google_cloud_run_service.default.name
  location = google_cloud_run_service.default.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
