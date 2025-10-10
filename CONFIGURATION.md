# Cost Distribution Configuration Guide

This document explains how to configure the enhanced cost distribution script for your organization's team allocation requirements.

## Quick Start

The script uses generic defaults that can be customized for your organization:
- **Default Primary Facet**: `costcenter` 
- **Default Metric Name**: `ingest`
- **Mobile Data**: Can be assigned to any team name (default: "mobile-team")
- **Infrastructure/APM/Browser**: Can be assigned to any team name (default: "platform-team")
- **Lambda Functions**: Mapped via configurable function name patterns
- **Enhanced Rate Limiting**: Fixed infinite loop issues with improved request tracking
- **Comprehensive Debugging**: NRQL result analysis and metric extraction logging

## Configuration Sections

### 1. Core Settings

```javascript
var FACET = 'costcenter'; // Primary attribute for team identification
var METRIC_NAME = 'ingest'; // Metric name for cost data
var TIME_RANGE = '30 minutes'; // Data collection window
```

**For Customer Request (tags.Team):**
```javascript
var FACET = 'tags.Team'; // Use Team tag as requested
var METRIC_NAME = 'ingest.team'; // Optional: reflect team-based allocation
```

### 2. Data Type Team Mapping

Automatically assigns specific data types to teams:

```javascript
const DATA_TYPE_TEAM_MAPPING = {
  // Mobile data → your mobile team name
  'MobileSession': 'mobile-team',
  'MobileCrash': 'mobile-team',
  'MobileRequest': 'mobile-team',
  
  // Infrastructure/APM/Browser → your platform team name
  'SystemSample': 'platform-team',  // Change to 'voltron' for specific customer
  'Transaction': 'platform-team',   // Change to 'voltron' for specific customer
  'PageView': 'platform-team',      // Change to 'voltron' for specific customer
  // ... more types
};
```

### 3. Lambda Function Name Patterns

Maps AWS Lambda functions to teams based on naming conventions:

```javascript
const LAMBDA_TEAM_MAPPING = {
  'team-alpha-*': 'team-alpha',        // Functions starting with team-alpha-
  'mobile-*': 'mobile-team',           // Functions starting with mobile-
  '*-analytics': 'data-team',          // Functions ending with -analytics
  '*-mobile-*': 'mobile-team',         // Functions containing -mobile-
};
```

### 4. Fallback Strategies

When primary tags are missing, try these attributes in order:

```javascript
const FALLBACK_STRATEGIES = {
  'custom_events': ['entity.name', 'appName', 'lambda_function_name'],
  'mobile_data': ['appName', 'entity.name'],
  'default': ['entity.name', 'appName', 'host']
};
```

## Common Customizations

### Adding New Data Types

To assign a new data type to a team:

```javascript
const DATA_TYPE_TEAM_MAPPING = {
  // Existing mappings...
  'YourCustomEventType': 'your-team-name',
};
```

### Adding Lambda Patterns

To add new function naming patterns:

```javascript
const LAMBDA_TEAM_MAPPING = {
  // Existing patterns...
  'your-prefix-*': 'your-team',
  '*-your-suffix': 'your-team',
};
```

### Custom Fallback Attributes

To add custom attributes for team detection:

```javascript
const FALLBACK_STRATEGIES = {
  'custom_events': ['your.custom.attribute', 'entity.name', 'appName'],
  // ...
};
```

## Team Assignment Logic

The script follows this priority order:

1. **Data Type Mapping**: Check if data type is hardcoded to a team
2. **Primary Facet**: Use `tags.Team` if available
3. **Lambda Mapping**: For custom events, check lambda function name patterns
4. **Fallback Attributes**: Try fallback attributes based on data type
5. **Pattern Matching**: Apply any configured patterns
6. **Default**: Assign to 'n/a' if nothing matches

## Customer-Specific Examples

### Example: Customer Request Implementation
```javascript
// Step 1: Update core settings
var FACET = 'tags.Team';           // Use Team tag as requested
var METRIC_NAME = 'ingest.team';   // Optional: team-based metric name

// Step 2: Update team mappings for customer names
const DATA_TYPE_TEAM_MAPPING = {
  // Mobile data → mobile-team (as requested)
  'MobileSession': 'mobile-team',
  'MobileCrash': 'mobile-team',
  
  // Infrastructure/APM/Browser → voltron (as requested)
  'SystemSample': 'voltron',
  'Transaction': 'voltron',
  'PageView': 'voltron',
  // ... update all platform-team entries to 'voltron'
};

// Step 3: Update Terraform variables
// In terraform.tfvars:
// cost_facet = "tags.Team"
// metric_name = "ingest.team"
```

### Generic Cost Center Allocation (Default)
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest';
// Uses generic team names: mobile-team, platform-team, etc.
```

### Service Namespace Allocation
```javascript
var FACET = 'service.namespace';
var METRIC_NAME = 'ingest.service_allocation';
// Still uses data type mappings as fallback
```

## Terraform Configuration

Update your `terraform.tfvars` to match your script configuration:

**Default Configuration:**
```hcl
cost_facet = "costcenter"    # Must match script's FACET variable
metric_name = "ingest"       # Must match script's METRIC_NAME
```

**For Customer Request:**
```hcl
cost_facet = "tags.Team"     # Must match script's FACET variable
metric_name = "ingest.team"  # Must match script's METRIC_NAME
```

## Debugging

### Enable Debug Logging
Enable debug logging by commenting out this line:
```javascript
// console.debug = function() {}
```

### Debug Output Features
Debug messages will show:
- **Data type team assignments**: Which data types are mapped to which teams
- **Lambda pattern matches**: Function name pattern matching results
- **Fallback attribute usage**: When and how fallback strategies are applied
- **Final team assignments**: Complete team assignment decisions
- **NRQL Result Analysis**: Structure of returned data for troubleshooting
- **Metric Extraction**: Property detection and value extraction debugging
- **Rate Limiting**: Request tracking and cleanup operations

### Performance Debugging
- **Request Lifecycle Tracking**: Timestamps for all API requests
- **Automatic Cleanup**: Removal of stuck requests older than 30 seconds
- **Timeout Protection**: Forces cleanup if waiting too long (5+ seconds)
- **Property Detection**: Searches multiple property names for bytecountestimate values

### Troubleshooting Common Issues

**Issue: 0 bytes reported despite successful queries**
- Check debug output for NRQL result structure
- Verify property names being searched for metric values
- Look for bytecountestimate, count, sum, or value properties

**Issue: Rate limiting problems**
- Enhanced rate limiting now prevents infinite loops
- Automatic request cleanup prevents stuck requests
- Reduced concurrent requests from 24 to 20 for stability

**Issue: Team assignments not working**
- Enable debug logging to see team assignment decisions
- Check DATA_TYPE_TEAM_MAPPING configuration
- Verify FACET variable matches your data structure

## Support

For questions about configuration or customization, refer to the main README.md or contact your New Relic implementation team.

---

# Private Configuration Management

This section explains how to maintain customer-specific configurations while keeping the main repository public.

## Current Implementation Status

The enhanced cost distribution script now includes:
- ✅ **Advanced team allocation system** with configurable mapping
- ✅ **Performance improvements** with fixed rate limiting
- ✅ **Enhanced debugging capabilities** for troubleshooting
- ✅ **Generic framework** that works for any organization
- ✅ **Comprehensive configuration options** for customer-specific needs

## Approach 1: Private Configuration Files (Recommended)

### Setup
1. Create a private repository or local directory for customer configurations
2. Use the public repository for the main codebase
3. Reference private configurations via environment variables or private files

### Structure
```
private-configs/
├── customer-a/
│   ├── config.js
│   └── patterns.js
├── customer-b/
│   ├── config.js
│   └── patterns.js
└── customer-c/
    ├── config.js
    └── patterns.js
```

### Example Private Configuration
```javascript
// private-configs/customer-a/config.js
module.exports = {
  // Core settings
  facet: 'tags.Team',                    // Customer's preferred facet
  metricName: 'ingest.team_allocation',  // Customer's metric naming
  region: 'EU',                          // Customer's region
  
  // Enhanced team mappings
  dataTypeTeamMapping: {
    'MobileSession': 'mobile-team',      // Customer's mobile team
    'SystemSample': 'voltron',           // Customer's platform team  
    'Transaction': 'voltron',            // Customer's platform team
    'PageView': 'voltron'                // Customer's platform team
  },
  
  // Lambda function patterns
  lambdaTeamMapping: {
    'customer-mobile-*': 'mobile-team',
    'customer-platform-*': 'voltron',
    '*-analytics': 'data-team'
  },
  
  // Debugging preferences
  enableDebugLogging: true,
  performanceMonitoring: true
};
```

## Approach 2: Environment-Based Configuration

### In Synthetics Monitor
```javascript
// Use secure credentials for sensitive config
const CUSTOMER_CONFIG = JSON.parse($secure.CUSTOMER_CONFIG || '{}');

// Merge with defaults
const config = { ...GENERIC_CONFIG, ...CUSTOMER_CONFIG };
```

### Example Secure Credential
```json
{
  "facet": "tags.Team",
  "metricName": "ingest.team_allocation", 
  "region": "EU",
  "dataTypeTeamMapping": {
    "MobileSession": "mobile-team",
    "SystemSample": "voltron",
    "Transaction": "voltron"
  },
  "lambdaTeamMapping": {
    "customer-mobile-*": "mobile-team",
    "customer-platform-*": "voltron"
  },
  "enableDebugLogging": true
}
```

## Approach 3: Configuration Templates

### Use Generic Templates
The public repository contains generic configuration examples:
- `cost-distribution-synthetics-api-script.js` - Main consolidated script
- `example-a-synthetics-script.js` - Geographic regions example

### Copy and Customize Privately
1. Copy the relevant script
2. Customize with actual customer values
3. Store in private location
4. Deploy to customer Synthetics environment

## Approach 4: Build-Time Configuration Injection

### CI/CD Pipeline
```yaml
# Example GitHub Actions
- name: Inject Customer Config
  run: |
    sed -i 's/PLACEHOLDER_METRIC_NAME/${{ secrets.METRIC_NAME }}/g' script.js
    sed -i 's/PLACEHOLDER_PATTERNS/${{ secrets.COST_PATTERNS }}/g' script.js
```

### Template Script
```javascript
// In public script - Enhanced configuration template
var FACET = 'PLACEHOLDER_FACET';
var METRIC_NAME = 'PLACEHOLDER_METRIC_NAME';

// Enhanced team mapping templates
const DATA_TYPE_TEAM_MAPPING = PLACEHOLDER_DATA_TYPE_MAPPING;
const LAMBDA_TEAM_MAPPING = PLACEHOLDER_LAMBDA_MAPPING;
const FALLBACK_STRATEGIES = PLACEHOLDER_FALLBACK_STRATEGIES;

// Performance settings
const MAX_CONCURRENT_REQUESTS = PLACEHOLDER_CONCURRENT_LIMIT;
const ENABLE_DEBUG_LOGGING = PLACEHOLDER_DEBUG_ENABLED;
```

## Recommended Workflow

### For Public Repository
1. Keep generic examples and templates
2. Use placeholder values
3. Document configuration options
4. Provide clear customization guides

### For Customer Deployments
1. Clone public repository
2. Apply private configuration
3. Deploy to customer environment
4. Keep private configs in separate version control

## Security Considerations

### Never Commit
- Customer names or identifiers
- Actual entity naming patterns
- Environment-specific details
- API keys or sensitive data

### Always Use
- Generic example names
- Placeholder patterns
- Environment variables for secrets
- Secure credential management in Synthetics

## Example Implementation

### Public Script Template
```javascript
// Enhanced Configuration - Replace with customer-specific values
var FACET = process.env.NR_FACET || 'costcenter';
var METRIC_NAME = process.env.NR_METRIC_NAME || 'ingest';
const REGION = process.env.NR_REGION || 'US';

// Enhanced team mapping from environment
const DATA_TYPE_TEAM_MAPPING = JSON.parse(process.env.NR_DATA_TYPE_MAPPING || '{}');
const LAMBDA_TEAM_MAPPING = JSON.parse(process.env.NR_LAMBDA_MAPPING || '{}');
const FALLBACK_STRATEGIES = JSON.parse(process.env.NR_FALLBACK_STRATEGIES || '{}');

// Performance and debugging settings
const MAX_CONCURRENT_REQUESTS = parseInt(process.env.NR_CONCURRENT_LIMIT || '20');
const ENABLE_DEBUG_LOGGING = process.env.NR_DEBUG_ENABLED === 'true';

// Conditional debug logging based on environment
if (!ENABLE_DEBUG_LOGGING) {
  console.debug = function() {};
}
```

### Customer Deployment
```bash
# Enhanced environment variables for customer deployment
export NR_FACET="tags.Team"
export NR_METRIC_NAME="ingest.team_allocation"
export NR_REGION="EU"

# Enhanced team mapping configurations
export NR_DATA_TYPE_MAPPING='{"MobileSession":"mobile-team","SystemSample":"voltron","Transaction":"voltron","PageView":"voltron"}'
export NR_LAMBDA_MAPPING='{"customer-mobile-*":"mobile-team","customer-platform-*":"voltron","*-analytics":"data-team"}'
export NR_FALLBACK_STRATEGIES='{"custom_events":["entity.name","appName","lambda_function_name"],"mobile_data":["appName","entity.name"],"default":["entity.name","appName","host"]}'

# Performance and debugging settings
export NR_CONCURRENT_LIMIT="20"
export NR_DEBUG_ENABLED="true"

# Deploy to Synthetics with these enhanced configurations
```

This approach allows you to maintain a clean public repository while keeping customer-specific details private and secure.