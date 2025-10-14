# New Relic Cost Distribution Tool

**Automatically allocate New Relic ingest costs to teams, projects, or business units based on your data tagging strategy.**

## What It Does

This tool analyzes your New Relic ingest data and creates cost allocation metrics that help you:
- **Track costs by team** - See exactly what each team is spending on observability
- **Identify cost drivers** - Understand which applications or services generate the most data
- **Enable chargeback/showback** - Fairly distribute New Relic costs across your organization
- **Optimize spending** - Make data-driven decisions about observability investments

## How It Works

1. **Analyzes your data** - Scans all event types across your New Relic accounts using `bytecountestimate()`
2. **Applies intelligent mapping** - Uses tags, entity names, and configurable patterns to assign costs
3. **Generates metrics** - Creates standardized cost allocation metrics for dashboards and reporting
4. **Updates regularly** - Runs as a New Relic Synthetics monitor for continuous cost tracking

## Business Value

Without cost allocation, you might face:
- ❌ Surprise observability bills with no accountability
- ❌ Teams over-instrumenting without cost awareness  
- ❌ Difficulty justifying observability investments
- ❌ Unfair cost distribution across business units

With this tool:
- ✅ Clear visibility into who's driving costs
- ✅ Data-driven optimization decisions
- ✅ Fair chargeback/showback models
- ✅ Proactive cost management

## Key Capabilities

### 📊 **Flexible Cost Allocation**
- **Tag-based assignment** - Primary method using `costCenter`, `team`, `product` attributes
- **Entity name pattern matching** - Fallback using configurable regex patterns
- **Data type mapping** - Automatic assignment of data types to teams
- **Custom business logic** - Lambda function patterns and custom event handling

### 🏢 **Multi-Account Support**
- **Multiple account analysis** - Works across all your New Relic accounts
- **Configurable team structures** - Adaptable to any organizational model
- **Geographic region support** - US and EU endpoint support
- **Custom metric naming** - Flexible naming for different business units

### ⚡ **Production Ready**
- **Runs in New Relic Synthetics** - No infrastructure needed
- **Rate limiting and error handling** - Robust production-grade reliability
- **Comprehensive logging** - Detailed debugging and monitoring capabilities
- **Proven at scale** - Handles enterprise-level data volumes

### 🔧 **Advanced Configuration**
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

## Repository Structure

- `cost-distribution-synthetics-api-script.js` - Main script for New Relic Synthetics
- `CONFIGURATION.md` - Detailed configuration options and examples  
- `TAGGING-GUIDE.md` - How to tag your data for effective cost allocation
- `dashboards/` - Dashboard templates and Terraform configurations
- `example-a-synthetics-script.js` - Geographic region example

## Quick Start

### Prerequisites: Data Tagging Strategy

Before using the cost distribution tool, you'll need to implement a consistent tagging strategy across your New Relic data sources. The effectiveness of cost allocation depends directly on how well your data is tagged.

📚 **See our comprehensive [TAGGING-GUIDE.md](TAGGING-GUIDE.md)** for detailed instructions on:
- Adding cost allocation tags to APM applications
- Configuring infrastructure agents with team attributes  
- Labeling Kubernetes resources for cost distribution
- Setting up browser monitoring with custom attributes
- Alternative strategies when tagging isn't immediately possible

### 1. Deploy to New Relic Synthetics (Recommended)

1. Copy the content of `cost-distribution-synthetics-api-script.js`
2. Configure the variables in the CONFIGURATION section:
   - Set `FACET` to your cost center attribute (e.g., `costcenter`, `tags.Team`)
   - Set `METRIC_NAME` to your desired metric name
   - Set `REGION` to "US" or "EU"
3. Set up secure credentials in Synthetics:
   - `COST_DISTRIBUTION_USER_API_KEY`: Your New Relic User API key
   - `COST_DISTRIBUTION_INGEST_KEY`: Your New Relic Ingest API key
4. Create a new Synthetics Scripted API monitor
5. Set frequency to every 30 minutes for optimal data collection

### 2. Configure Team Mappings

Customize the team allocation logic in your script:

```javascript
// Core settings
var FACET = 'costcenter'; // or 'tags.Team'
var METRIC_NAME = 'ingest';

// Data type to team mapping
const DATA_TYPE_TEAM_MAPPING = {
  'MobileSession': 'mobile-team',
  'SystemSample': 'platform-team',
  'Transaction': 'platform-team',
  // ... customize for your teams
};
```

### 3. Deploy Dashboards

Choose your preferred dashboard approach:
- **JSON Dashboards**: Import `dashboards/json/generic-dashboard.json`
- **Terraform** (recommended): Use `dashboards/terraform/` for version-controlled deployments

For detailed configuration options and examples, see [CONFIGURATION.md](CONFIGURATION.md).

For guidance on implementing the tagging strategy that makes cost distribution effective, see [TAGGING-GUIDE.md](TAGGING-GUIDE.md).

## Configuration Examples

### Basic Configuration
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest';
const REGION = "US";
```

### Team-Based Allocation
```javascript
var FACET = 'tags.Team';
var METRIC_NAME = 'ingest.team';
const REGION = "US";
```

### Geographic Regions
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest.geographic';
const REGION = "EU";
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'}
];
```

## Dashboard Integration

The repository provides multiple options for creating dashboards to visualize the cost distribution metrics:

### JSON Dashboards (Quick Start)
- Import `dashboards/json/generic-dashboard.json` directly into New Relic UI
- Ready-to-use dashboard for immediate cost visualization

### Terraform Dashboards (Recommended for Production)
- Located in `dashboards/terraform/`
- Version-controlled dashboard configuration
- Automated deployment and updates
- See `dashboards/terraform/README.md` for setup instructions

## Local Development and Testing

### Prerequisites
- Node.js version 16.10 or higher
- Git

### Running Locally
```bash
# Clone the repository
git clone <repository-url>
cd newrelic-cost-distribution

# Install dependencies
npm install

# Test the script locally
npm run simulate
```

### Environment Configuration
Set your New Relic API keys as environment variables:
```bash
export COST_DISTRIBUTION_USER_API_KEY="your-user-api-key"
export COST_DISTRIBUTION_INGEST_KEY="your-ingest-key"
```

### Benefits of Local Testing
- ✅ **Faster Development**: Test changes without deploying to Synthetics
- ✅ **Debug Output**: See detailed console output and error messages
- ✅ **Configuration Testing**: Validate your cost center patterns and configurations
- ✅ **API Validation**: Verify API connectivity and data retrieval

## Advanced Features

### Enhanced Team Allocation Logic
- **Data Type to Team Mapping**: Automatic assignment of specific data types to teams
- **Lambda Function Name Patterns**: Configurable patterns for AWS Lambda team identification
- **Smart Fallback Strategies**: Intelligent attribute selection based on data type context
- **Custom Event Handling**: Special logic for events without standard tags

### Performance & Reliability
- **Improved Rate Limiting**: Fixed infinite loop issues with timestamp-based request tracking
- **Automatic Request Cleanup**: Removes stuck requests older than 30 seconds
- **Timeout Protection**: Forces cleanup if waiting too long (5+ seconds)
- **Enhanced Error Handling**: Comprehensive error recovery in all request scenarios

### Development & Debugging Features
- **Environment Detection**: Automatic detection of local vs. Synthetics environment
- **Enhanced Debugging**: NRQL result structure analysis and metric extraction logging
- **Property Detection**: Comprehensive search for bytecountestimate values across different property names
- **Team Assignment Visibility**: Detailed logging for troubleshooting team mapping

## Recent Updates

**Latest Enhancements (October 2025):**
- ✅ **Advanced Team Mapping**: Intelligent team assignment with data type mapping, lambda function patterns, and fallback strategies
- ✅ **Rate Limiting Fixes**: Resolved infinite loop issues with improved concurrent request handling (20 concurrent max)
- ✅ **Enhanced Debugging**: Comprehensive NRQL result structure analysis and metric extraction debugging
- ✅ **Configuration-Driven Approach**: All team mappings configurable for maximum reusability across organizations
- ✅ **Dynamic Terraform Integration**: Dashboards automatically sync with script facet configuration
