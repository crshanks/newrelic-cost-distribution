# Private Configuration Management

This guide explains how to maintain customer-specific configurations while keeping the main repository public.

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
  facet: 'costcenter',
  metricName: 'ingest.customer_a',
  region: 'EU',
  costCenterPatterns: [
    { pattern: '.*-si-.*', value: 'slovenia'},
    { pattern: '.*-pl-.*', value: 'poland'}
  ]
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
  "facet": "costcenter",
  "metricName": "ingest.customer_a", 
  "region": "EU",
  "costCenterPatterns": [
    {"pattern": ".*-si-.*", "value": "slovenia"}
  ]
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
// In public script
var METRIC_NAME = 'PLACEHOLDER_METRIC_NAME';
const costCenterPatterns = PLACEHOLDER_PATTERNS;
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
// Configuration - Replace with customer-specific values
var FACET = process.env.NR_FACET || 'costcenter';
var METRIC_NAME = process.env.NR_METRIC_NAME || 'ingest';
const REGION = process.env.NR_REGION || 'US';

// Load patterns from environment or use defaults
const costCenterPatterns = JSON.parse(process.env.NR_PATTERNS || '[]');
```

### Customer Deployment
```bash
# Set environment variables
export NR_FACET="costcenter"
export NR_METRIC_NAME="ingest.customer_a"
export NR_REGION="EU"
export NR_PATTERNS='[{"pattern":".*-si-.*","value":"slovenia"}]'

# Deploy to Synthetics with these values
```

This approach allows you to maintain a clean public repository while keeping customer-specific details private and secure.
