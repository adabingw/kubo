variable "project_id" {
  type = string
}

variable "service_account" {
  type = string
}

variable "roles" {
  description = "List of IAM roles to assign to the service account"
  type        = list(string)
}
