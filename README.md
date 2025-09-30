# New Relic Cost Distribution - Consolidated Approach

This repository provides a consolidated approach to New Relic ingest cost distribution monitoring, incorporating improvements from multiple customer-specific implementations.

## Project Structure

```
newrelic-cost-distribution/
├── README.md                           # This file
├── MIGRATION.md                        # Migration guide from individual scripts
├── PRIVATE-CONFIG.md                   # Private configuration management guide
├── cost-distribution-synthetics-api-script.js   # Main single-file script for Synthetics
├── example-a-synthetics-script.js      # Example with geographic patterns
└── dashboards/                        # Dashboard configurations
    ├── json/                          # JSON-based dashboard files
    │   └── generic-dashboard.json     # Generic dashboard example
    └── terraform/                     # Terraform-based dashboard infrastructure
        ├── README.md                  # Terraform setup instructions
        ├── provider.tf                # Terraform provider configuration
        ├── runtf.sh.sample           # Example deployment script
        └── templates/                 # Terraform template files
            └── nrql_ingest_users_chargeback.json.tftpl
```

## Key Improvements Consolidated

### 1. Environment Detection & Local Development Support
- Automatic detection of local vs. Synthetics environment
- Local development simulator integration
- Configurable debug logging

### 2. Enhanced Cost Center Pattern Matching
- Regex-based pattern matching for entity names
- Customer-specific cost center assignment rules
- Fallback to entity.name and appName when primary facet unavailable

### 3. Regional API Support
- Dynamic US/EU endpoint selection
- Proper regional API routing

### 4. Improved Error Handling
- Comprehensive error handling and logging
- Graceful degradation when data unavailable
- Better rate limiting between account processing

### 5. Flexible Configuration
- Easy customer-specific customization
- Configurable exclusions and metric names
- Pattern-based cost center mapping

## Usage

### For New Relic Synthetics (Recommended)

Use `cost-distribution-synthetics-api-script.js` as a single-file Synthetics Scripted API monitor:

1. Copy the content of `cost-distribution-synthetics-api-script.js`
2. Configure the variables in the CONFIGURATION section:
   - Set `FACET` to your cost center attribute
   - Set `METRIC_NAME` to your desired metric name
   - Set `REGION` to "US" or "EU"
   - Configure `costCenterPatterns` for entity name mapping
3. Set up secure credentials in Synthetics:
   - `COST_DISTRIBUTION_USER_API_KEY`: Your New Relic User API key
   - `COST_DISTRIBUTION_INGEST_KEY`: Your New Relic Ingest API key
4. Create a new Synthetics Scripted API monitor with the script
5. Configure execution settings:
   - **Frequency**: Set to run every 30 minutes for optimal data collection
   - **Location**: Choose a location close to your New Relic region for best performance:
     - **US Region**: `us-east-1` (Washington DC, US)
     - **EU Region**: `eu-central-1` (Frankfurt, DE)

### Customer-Specific Versions

This repository provides generic examples that can be customized:
- **Example A**: Geographic region-based cost centers
- **Example B**: Custom cost center attributes  
- **Example C**: Standard allocation attributes

For customer-specific implementations, see `PRIVATE-CONFIG.md` for secure configuration management approaches.

## Local Development and Testing

### Prerequisites
- Node.js version 16.10 or higher
- Git

### Installation
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd newrelic-cost-distribution
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Locally

#### Test the Synthetics Script Locally
```bash
npm run simulate
```
This runs the main Synthetics script (`cost-distribution-synthetics-api-script.js`) directly in your local Node.js environment, allowing you to test the script with your API keys and configuration before deploying it to New Relic Synthetics.

### Environment Configuration
Before running locally, you'll need to set up environment variables or modify the configuration:

1. **API Keys**: Set your New Relic API keys in environment variables:
   ```bash
   export COST_DISTRIBUTION_USER_API_KEY="your-user-api-key"
   export COST_DISTRIBUTION_INGEST_KEY="your-ingest-key"
   ```

2. **Configuration**: Edit the configuration variables at the top of the scripts to match your environment.

### Local Testing Benefits
- ✅ **Faster Development**: Test changes without deploying to Synthetics
- ✅ **Debug Output**: See detailed console output and error messages
- ✅ **Configuration Testing**: Validate your cost center patterns and configurations
- ✅ **API Validation**: Verify API connectivity and data retrieval

### Compatibility Notes
The project uses **CommonJS** (`require()`) syntax to ensure compatibility with New Relic Synthetics:
- ✅ **Synthetics Compatible**: Uses `const got = require('got')` which works in Synthetics
- ✅ **Local Development**: Same syntax works in local Node.js environment
- ✅ **Version Pinned**: Uses `got@^11.8.6` for maximum compatibility (newer versions are ES modules only)

**Important**: Do not convert `require()` statements to `import` statements as this will break Synthetics compatibility.

## Configuration Examples

### Generic Configuration
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest';
const REGION = "US";
const costCenterPatterns = [];
```

### Example A (Geographic Regions)
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest.org_a';
const REGION = "EU";
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'}
];
```

### Example B (Custom Attributes)
```javascript
var FACET = 'Cost Center';
var METRIC_NAME = 'ingest.org_b';
const REGION = "US";
```

### Example C (Standard Allocation)
```javascript
var FACET = 'NewRelicCostAllocation';
var METRIC_NAME = 'cost_distribution';
const REGION = "EU";
```

## Cost Center Pattern Matching

The script supports regex-based pattern matching to map entity names to cost centers:

```javascript
const costCenterPatterns = [
  { pattern: 'prod-.*', value: 'production'},
  { pattern: 'dev-.*', value: 'development'},
  { pattern: 'test-.*', value: 'testing'},
  { pattern: '.*-eu-.*', value: 'europe'},
  { pattern: '.*-us-.*', value: 'north-america'}
];
```

## Fallback Strategy

When the primary facet attribute is not available, the script tries:
1. Primary facet (e.g., 'costcenter')
2. entity.name
3. appName
4. 'n/a' as final fallback

## Benefits of This Approach

### Single-File for Synthetics
- ✅ Works directly in New Relic Synthetics without modifications
- ✅ No external dependencies or module loading issues
- ✅ Self-contained and portable

### Consolidated Improvements
- ✅ All customer improvements integrated
- ✅ Enhanced error handling and logging
- ✅ Better cost center determination logic
- ✅ Regional endpoint support

### Easy Customization
- ✅ Clear configuration section at the top
- ✅ Customer-specific pattern examples
- ✅ Simple enable/disable for features

## Implementation Path

1. **Current**: Use the consolidated Synthetics script for all deployments
2. **Configuration**: Customize patterns and settings per customer needs
3. **Dashboard**: Use provided dashboard templates for visualization

## Dashboard Integration

The repository provides multiple options for creating dashboards to visualize the cost distribution metrics:

### JSON Dashboards (Traditional Approach)
Located in `dashboards/json/`, these are ready-to-import dashboard JSON files:
- `generic-dashboard.json` - Basic cost distribution dashboard
- Works with metrics generated by the cost distribution scripts
- Can be imported directly into New Relic UI

### Terraform Dashboards (Observability as Code)
Located in `dashboards/terraform/`, this provides an Observability as Code approach:
- **Recommended for production environments**
- Version-controlled dashboard configuration
- Automated deployment and updates
- Template-based NRQL queries for consistency
- See `dashboards/terraform/README.md` for setup instructions

#### Terraform Setup Quick Start:
1. Navigate to `dashboards/terraform/`
2. Copy `runtf.sh.sample` to `runtf.sh` and configure your settings
3. Run `terraform init && terraform plan && terraform apply`
4. Dashboard will be created automatically in your New Relic account

## Next Steps

1. Test the consolidated script in your Synthetics environment
2. Configure customer-specific patterns as needed
3. Update existing dashboard queries to match new metric names
4. Set up automated dashboard deployment using Terraform templates
