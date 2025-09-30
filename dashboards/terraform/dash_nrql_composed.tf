provider "graphql" {
  url = "https://api.newrelic.com/graphql" # GraphQL API endpoint, US region: api.newrelic.com/graphql, EU region: api.eu.newrelic.com/graphql
  headers = {
    "API-Key" = var.NEW_RELIC_API_KEY
  }
}

data "graphql_query" "basic_query" {
  query_variables = {
    accountId = var.accountId
  }
  query = templatefile("./getIngestByDataType.gql", {
    metric_name = var.metric_name
  })
}

# Uncoment to see the output from the NRQL query
output "response" {
  value = data.graphql_query.basic_query.query_response
}


# This generates the 'rows' of widgets from the CONFIG object
locals {
  composed_render = templatefile(
    "${path.module}/templates/nrql_ingest_users_chargeback.json.tftpl",
    {
      ACCOUNTID   = var.accountId
      METRIC_NAME = var.metric_name
      COST_FACET  = var.cost_facet
      CONFIG      = jsondecode(data.graphql_query.basic_query.query_response).data.actor.account.nrql.results
    }
  )
}

resource "newrelic_one_dashboard_json" "nrql_dashboard" {
  json = local.composed_render
}

#Lets tag terraform managed dashboards!
resource "newrelic_entity_tags" "nrql_dashboard" {
  guid = newrelic_one_dashboard_json.nrql_dashboard.guid
  tag {
    key    = "terraform"
    values = [true]
  }
}

output "nrql_dashboard" {
  value = newrelic_one_dashboard_json.nrql_dashboard.permalink
}