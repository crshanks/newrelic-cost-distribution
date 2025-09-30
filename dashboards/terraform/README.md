# Terraform Dashboard Configuration

This directory contains Terraform configuration files for creating New Relic dashboards programmatically.

## Files

- `runtf.sh.sample` - Example bash script for running Terraform commands
- `provider.tf` - Terraform provider configuration for New Relic
- `dash_nrql_composed.tf` - Main dashboard configuration file
- `getIngestByDataType.gql` - GraphQL query template for ingest data
- `terraform.tfvars.example` - Example variables configuration file
- `templates/` - Directory containing Terraform template files
  - `nrql_ingest_users_chargeback.json.tftpl` - NRQL template for ingest users chargeback dashboard

## Configuration

### Metric Name Configuration
**Critical**: The metric name must match the `METRIC_NAME` variable used in your cost distribution scripts.

**Common metric names:**
- `ingest` - Default/generic metric name (recommended for new implementations)
- `cost_distribution` - Alternative naming convention
- `custom_metric` - User-defined metric names

### Region Configuration
**Important**: You must update the region settings in multiple files to match your New Relic account region:

1. **`provider.tf`** - Update the `region` parameter in the New Relic provider configuration:
   ```hcl
   provider "newrelic" {
     region     = "US"  # Change to "EU" for European accounts
   }
   ```

2. **`dash_nrql_composed.tf`** - Update the GraphQL provider URL:
   ```hcl
   provider "graphql" {
     url = "https://api.eu.newrelic.com/graphql"  # Use api.newrelic.com for US
   }
   ```

### Variables Configuration
1. **Copy the example file**: `cp terraform.tfvars.example terraform.tfvars`
2. **Edit terraform.tfvars** with your specific values:
   ```hcl
   accountId = "your-account-id"
   NEW_RELIC_API_KEY = "your-api-key"
   metric_name = "ingest"  # Match your synthetics script configuration
   cost_facet = "costcenter"  # Match your synthetics script FACET variable
   ```

### Important: Synchronize with Your Script
**Critical**: The `cost_facet` variable must match the `FACET` variable in your cost distribution script:

**Example Configurations:**
```hcl
# If your script uses: var FACET = 'costcenter';
cost_facet = "costcenter"
metric_name = "ingest"

# If your script uses: var FACET = 'NewRelicCostAllocation';  
cost_facet = "NewRelicCostAllocation"
metric_name = "cost_distribution"

# If your script uses: var FACET = 'service.namespace';
cost_facet = "service.namespace"
metric_name = "ingest.service.namespace"
```

This ensures your dashboard displays data using the same facet attribute that your script is collecting.

### API Key Configuration
Configure your New Relic credentials through:
- `terraform.tfvars` file (recommended)
- Environment variables: `NEW_RELIC_API_KEY` and `NEW_RELIC_ACCOUNT_ID`
- Direct configuration in `runtf.sh`

## Usage

1. **Configure Metric Name**: Ensure the `metric_name` variable matches the `METRIC_NAME` used in your Synthetics cost distribution script
2. **Configure Region**: Update the `region` parameter in `provider.tf` and GraphQL URL in `dash_nrql_composed.tf` to match your New Relic account region ("US" or "EU")
3. **Set up Variables**: Copy `terraform.tfvars.example` to `terraform.tfvars` and configure your account ID, API key, and metric name
4. **Set up Deployment Script**: Copy `runtf.sh.sample` to `runtf.sh` and customize as needed
5. **Initialize Terraform**: Run `terraform init` to initialize the configuration
6. **Review Changes**: Run `terraform plan` to review the changes that will be made
7. **Deploy Dashboard**: Run `terraform apply` to create the dashboard in your New Relic account

## Requirements

- Terraform installed
- New Relic API key configured
- Appropriate permissions to create dashboards in your New Relic account
