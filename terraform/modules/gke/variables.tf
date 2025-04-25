variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
}

variable "cluster_name" {
  type        = string
  default     = "gke-cluster"
}

variable "node_machine_type" {
  type        = string
  default     = "e2-medium"
}

variable "node_count" {
  type        = number
  default     = 1
}
