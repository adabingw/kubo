variable "name"           { type = string }
variable "project_id"     { type = string }
variable "region"         { type = string }
variable "image"          { type = string }
variable "service_account"{ type = string }
variable "memory"         { 
    type = string 
    default = "512Mi" 
}
variable "cpu"            { 
    type = string 
    default = "1" 
}
variable "max_scale"      { 
    type = string 
    default = "10" 
}
variable "env_vars" {
  type    = list(object({ name = string, value = string }))
  default = []
}
variable "allow_unauthenticated" {
  type    = bool
  default = true
}
