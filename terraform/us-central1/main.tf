module "firestore" {
  source        = "../../modules/firestore"
  project_id    = var.project_id
  location      = var.region          # ← pass region as location
  database_type = "FIRESTORE_NATIVE"
}

module "cloudrun" {
  source              = "../../modules/cloudrun"
  name                = "polling"
  project_id          = var.project_id
  region              = var.region
  image               = "gcr.io/${var.project_id}/polling-0:latest"
  service_account     = var.cloudrun_sa
  allow_unauthenticated = true
  env_vars = [
    { name = "ENV", value = "dev" }
  ]
}

module "pubsub" {
  source     = "../../modules/pubsub"
  project_id = var.project_id
}

module "iam" {
  source                = "../../modules/iam"
  project_id            = var.project_id
  service_account_email = var.service_account

  roles = [
    "roles/artifactregistry.admin",
    "roles/artifactregistry.createOnPushRepositoryAdmin",
    "roles/artifactregistry.writer",
    "roles/datastore.user",
    "roles/pubsub.editor",
    "roles/pubsublite.publisher",
    "roles/pubsub.publisher",
  ]
}

module "gke" {
  source          = "../../modules/gke"
  project_id      = var.project_id
  region          = var.region
  cluster_name    = "kube-"
  node_count      = 2
  node_machine_type = "e2-standard-2"
}

