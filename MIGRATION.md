# Migration Guide

## Moving from Individual Scripts to Consolidated Version

This guide helps you migrate from individual customer-specific scripts to the new consolidated approach while maintaining privacy.

## Quick Migration Steps

### 1. For Synthetics Users (Recommended)

**Current State**: Using individual customer-specific scripts

**Migration Path**:
1. Use `cost-distribution-synthetics-api-script.js` or relevant example script
2. Apply your private configuration using one of the methods in `PRIVATE-CONFIG.md`
3. Replace your existing Synthetics monitor script

### 2. Configuration Mapping

| Pattern Type | New Configuration |
|-------------|-------------------|
| Geographic regions | Use Example A configuration pattern |
| Custom cost center attributes | Use Example B configuration pattern |
| Standard allocation attributes | Use Example C configuration pattern |
| Generic/default | Use consolidated script with default settings |

### 3. Configuration Examples

#### Example A: Geographic Region Migration
**Pattern**: Entity names with regional identifiers

**New Configuration**:
```javascript
var FACET = 'costcenter';
var METRIC_NAME = 'ingest.org_a';
const REGION = "EU";
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'}
];
```

#### Example B: Custom Attribute Migration
**Pattern**: Using custom cost center attributes

**New Configuration**:
```javascript
var FACET = 'Cost Center';
var METRIC_NAME = 'ingest.org_b';
const REGION = "US";
const costCenterPatterns = []; // No patterns needed
```

#### Example C: Standard Allocation Migration
**Pattern**: Using NewRelicCostAllocation standard

**New Configuration**:
```javascript
var FACET = 'NewRelicCostAllocation';
var METRIC_NAME = 'cost_distribution';
const REGION = "EU";
const costCenterPatterns = []; // No patterns needed
```

## Benefits After Migration

### Immediate Benefits
- ✅ All customer improvements in one script
- ✅ Better error handling and logging
- ✅ Enhanced cost center pattern matching
- ✅ Fallback support for entity.name and appName
- ✅ Improved regional endpoint handling

### Long-term Benefits
- ✅ Easier maintenance and updates
- ✅ Consistent behavior across environments
- ✅ Better documentation and examples
- ✅ Clear single-file approach for all deployments

## Testing Your Migration

### 1. Local Testing
1. Copy the new consolidated script
2. Configure your specific settings
3. Set up local environment variables
4. Test with sample data

### 2. Synthetics Testing
1. Create a new Synthetics monitor with the consolidated script
2. Run in parallel with existing monitor initially
3. Compare results to ensure accuracy
4. Switch over once validated

### 3. Validation Checklist
- [ ] Metrics are being created with correct names
- [ ] Cost center assignments are working as expected
- [ ] All accounts are being processed
- [ ] Error handling is working properly
- [ ] Regional endpoints are correct

## Rollback Plan

If issues arise:
1. Keep your original scripts as backup
2. Revert to original Synthetics monitor
3. Report issues for investigation
4. Test configuration changes locally using the simulator

## Dashboard Updates

After migration, update your dashboards:

1. **Metric Name Changes**: Update queries if metric names changed
2. **Facet Name Changes**: Update facet references if needed
3. **Account IDs**: Ensure dashboard account IDs are correct

Example dashboard query update:
```sql
-- Original
SELECT sum(ingest) FROM Metric where metricName = 'ingest' facet costcenter

-- New (if metric name changed)
SELECT sum(ingest.yourcompany) FROM Metric where metricName = 'ingest.yourcompany' facet costcenter
```

## Support

For migration issues:
1. Check the configuration examples in README.md
2. Validate your secure credentials are set correctly
3. Review console logs for error messages
4. Compare with working customer-specific examples

## Timeline Recommendation

- **Week 1**: Set up consolidated script in test environment
- **Week 2**: Run parallel with existing scripts for validation
- **Week 3**: Switch over production Synthetics monitors
- **Week 4**: Update dashboards and clean up old scripts
