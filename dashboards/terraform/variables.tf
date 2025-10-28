variable "accountId" {
  description = "New Relic account ID where dashboards will be created"
  type        = string
}

variable "NEW_RELIC_API_KEY" {
  description = "New Relic API key for authentication"
  type        = string
  sensitive   = true
}

variable "metric_name" {
  description = "The metric name used by your cost distribution script"
  type        = string
  default     = "ingest"
}

variable "cost_facet" {
  description = "The facet attribute used for cost distribution (should match script's FACET variable)"
  type        = string
  default     = "costcenter"
}

variable "dashboard_name" {
  description = "The name for the cost distribution dashboard"
  type        = string
  default     = "newrelic-cost-distribution"
}

variable "config" {
  description = "Configuration for dashboard widgets - accounts and data types to analyze"
  type = list(object({
    facet = list(string)
  }))
  default = [
    {
      facet = ["Log", "Transaction", "SystemSample", "MobileSession", "PageView"]
    }
  ]
}