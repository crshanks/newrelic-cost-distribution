# New Relic Cost Distribution - Enhanced Team Allocation

This repository provides an enhanced approach to New Relic ingest cost distribution monitoring with advanced team allocation capabilities, incorporating configuration-based mappings for complex organizational structures.

## Recent Updates 🚀

**Latest Enhancements (October 2025):**
- ✅ **Advanced Team Mapping**: Intelligent team assignment with data type mapping, lambda function patterns, and fallback strategies
- ✅ **Rate Limiting Fixes**: Resolved infinite loop issues with improved concurrent request handling (20 concurrent max)
- ✅ **Enhanced Debugging**: Comprehensive NRQL result structure analysis and metric extraction debugging
- ✅ **Configuration-Driven Approach**: All team mappings configurable for maximum reusability across organizations
- ✅ **Dynamic Terraform Integration**: Dashboards automatically sync with script facet configuration

## Key Features ✨

### 🏷️ **Smart Team Assignment**
- **Data Type Mapping**: Automatically assigns data types to teams (e.g., Mobile → mobile-team, Infrastructure/APM/Browser → platform-team)
- **Lambda Function Patterns**: Maps AWS Lambda functions to teams via configurable name patterns  
- **Primary Facet Strategy**: Uses configurable facet (e.g., `tags.Team`, `costcenter`) as primary identification with intelligent fallbacks
- **Custom Event Handling**: Special logic for custom events without standard tags using lambda function name patterns

### 🔧 **Enhanced Configuration System**
```javascript
// Data type to team mapping
const DATA_TYPE_TEAM_MAPPING = {
  'MobileSession': 'mobile-team',
  'MobileCrash': 'mobile-team',
  'SystemSample': 'platform-team',
  'Transaction': 'platform-team',
  // ... configurable for any organization
};

// Lambda function name patterns
const LAMBDA_TEAM_MAPPING = {
  'team-alpha-*': 'team-alpha',
  'analytics-*': 'data-team',
  '*-mobile-*': 'mobile-team'
};
```

### 🚀 **Performance & Reliability**
- **Optimized Rate Limiting**: Intelligent concurrent request management with automatic cleanup
- **Enhanced Error Recovery**: Improved error handling with proper request lifecycle management
- **Comprehensive Debugging**: Detailed logging for troubleshooting data extraction and team assignment
- **Timeout Protection**: Prevents infinite loops and stuck requests with automatic cleanup

## Project Structure

```
newrelic-cost-distribution/
├── README.md                           # This file
├── CONFIGURATION.md                    # Detailed configuration guide
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

### 1. Enhanced Team Allocation Logic
- **Data Type to Team Mapping**: Automatic assignment of specific data types to teams
- **Lambda Function Name Patterns**: Configurable patterns for AWS Lambda team identification
- **Smart Fallback Strategies**: Intelligent attribute selection based on data type context
- **Custom Event Handling**: Special logic for events without standard tags

### 2. Performance & Reliability Enhancements
- **Improved Rate Limiting**: Fixed infinite loop issues with timestamp-based request tracking
- **Automatic Request Cleanup**: Removes stuck requests older than 30 seconds
- **Timeout Protection**: Forces cleanup if waiting too long (5+ seconds)
- **Enhanced Error Handling**: Comprehensive error recovery in all request scenarios

### 3. Advanced Configuration Management
- **Team Mapping Objects**: Centralized configuration for all team assignments
- **Fallback Strategy Configuration**: Customizable attribute priorities by data type
- **Pattern-Based Matching**: Regex support for complex organizational structures
- **Regional API Support**: Dynamic US/EU endpoint selection

### 4. Development & Debugging Features
- **Environment Detection**: Automatic detection of local vs. Synthetics environment
- **Enhanced Debugging**: NRQL result structure analysis and metric extraction logging
- **Property Detection**: Comprehensive search for bytecountestimate values across different property names
- **Team Assignment Visibility**: Detailed logging for troubleshooting team mapping

### 5. Customer Requirements Integration
- **Configurable Primary Facet**: Default `costcenter`, easily changed to `tags.Team` or any attribute
- **Generic Team Names**: Uses `mobile-team`, `platform-team` by default, customizable to any names
- **Lambda Team Mapping**: Function name patterns for team identification
- **Reusable Framework**: Same codebase works for any organization with configuration changes

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

For detailed configuration options and examples, see `CONFIGURATION.md`.

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
