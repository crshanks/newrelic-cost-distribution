# terraform config 
terraform {
  required_version = "~> 1.4.6"
  required_providers {
    newrelic = {
      source  = "newrelic/newrelic"
      version = "~> 3.16.0, <4.0.0"
    }
    graphql = {
      source  = "sullivtr/graphql"
      version = "2.5.2"
    }
  }
}

provider "newrelic" {
  region = "US" # New Relic region, either "US" or "EU"
}