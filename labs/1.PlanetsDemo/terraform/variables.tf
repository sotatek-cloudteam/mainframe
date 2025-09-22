variable "region" {
  type = string
  default = "us-east-1"
}

variable "profile" {
  type    = string
  default = null
}

variable "name" {
  type    = string
  default = "terraform-m2-demo-planet"
}

variable "engine_type" {
  type    = string
  default = "bluage"
}

variable "engine_version" {
  type    = string
  default = "3.9.0"
}

variable "instance_type" {
  type    = string
  default = "M2.m5.large"
}

variable "port" {
  type    = string
  default = "8196"
}

variable "vpc_id" {
  type        = string
  default     = "vpc-0d13f4a066e668ecd"
  description = "ID for VPC"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR for VPC"
}

variable "azs" {
  type        = number
  default     = 2
  description = "Number of availability zones to deploy in"
  validation {
    condition     = var.azs >= 2
    error_message = "Mainframe Modernization requires at least two availability zones"
  }
}

variable "subnet_ids" {
  type        = list(string)
  default     = ["subnet-06cb8fef122bc5b87", "subnet-0b1f0f779b4afa44c"]
  description = "IDs for subnets"
}

variable "default_tags" {
  type = map(string)
  default = {
    project = "mainframe-modernization-planet-demo",
    managedBy = "terraform"
  }
}