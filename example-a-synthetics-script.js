/**
 * Example A: Geographic Region-based Cost Distribution - Enhanced Version
 * Shows entity name pattern matching for regional cost center assignment
 * Based on the enhanced cost distribution framework with improved performance and reliability
 * This is a template - customize with your actual patterns and values
 */

const got = require('got');

const IS_LOCAL_ENV = typeof $env === "undefined" || $env === null;

// Comment the following lines to enable debug messages
//console.log = function() {}
//console.debug = function() {}

/**
 * For local development
 */
if (IS_LOCAL_ENV) {
  global._isApiTest = true;
  global.$secure = {
    COST_DISTRIBUTION_USER_API_KEY: "NRAK-YOUR_API_KEY_HERE",
    COST_DISTRIBUTION_INGEST_KEY: "YOUR_INGEST_KEY_HERE"
  };
}

/* -------------------CONFIGURATION-------------------------------------- */
var API_KEY = $secure.COST_DISTRIBUTION_USER_API_KEY;
var INGEST_KEY = $secure.COST_DISTRIBUTION_INGEST_KEY;
var FACET = 'costcenter';
var METRIC_NAME = 'ingest.org_a';
var TIME_RANGE = '30 minutes';
var USE_FALLBACK_FACETS = true; // Enable fallback facets for this example

// Enhanced team mapping for geographic regions
const DATA_TYPE_TEAM_MAPPING = {
  // Mobile data types → mobile-team
  'MobileSession': 'mobile-team',
  'MobileCrash': 'mobile-team', 
  'MobileRequest': 'mobile-team',
  'MobileRequestError': 'mobile-team',
  'MobileHandledException': 'mobile-team',
  'Mobile': 'mobile-team',
  
  // Infrastructure, APM, Browser data types → platform-team
  'SystemSample': 'platform-team',
  'ProcessSample': 'platform-team',
  'StorageSample': 'platform-team',
  'NetworkSample': 'platform-team',
  'ContainerSample': 'platform-team',
  'InfrastructureEvent': 'platform-team',
  'Transaction': 'platform-team',
  'TransactionError': 'platform-team',
  'TransactionTrace': 'platform-team',
  'PageView': 'platform-team',
  'PageAction': 'platform-team',
  'JavaScriptError': 'platform-team',
  'BrowserInteraction': 'platform-team',
  'PageViewTiming': 'platform-team',
  'BrowserTiming': 'platform-team'
};

// Lambda function patterns for geographic example
const LAMBDA_TEAM_MAPPING = {
  'region1-*': 'region_a',
  'region2-*': 'region_b',
  '*-region1-*': 'region_a',
  '*-region2-*': 'region_b'
};

// Fallback strategies
const FALLBACK_STRATEGIES = {
  'custom_events': ['entity.name', 'appName', 'lambda_function_name'],
  'mobile_data': ['appName', 'entity.name'],
  'default': ['entity.name', 'appName', 'host']
};

var excludedEventTypes = [
  "AuditLog", "ActivityEvent", "AgentUpdate", "ApplicationAgentContext",
  "CorrelationTriggered", "CorrelationTriggeredV2", "EntityAudits", "DistributedTraceSummary",
  "NrAiAnomaly", "NrAiIncident", "NrAiIssue", "NrAiNotification", "NrAiSignal",
  "NrAiInternalIncident", "NrAiInternalIssue", "NrAuditEvent", "NrComputeUsage",
  "NrConsumption", "NrIntegrationError", "NrMTDConsumption", "NrNotificationsEvent",
  "NrDailyUsage", "NrUsage", "NrdbQuery", "IntegrationDataFreshnessReport",
  "IntegrationProviderReport", "IssueActivated", "IssueCreated", "IssueClosed",
  "IssueMerged", "Public_APICall", "Relationship", "SyntheticsPrivateLocationStatus",
  "SyntheticsPrivateMinion", "SyntheticCheck", "SyntheticRequest",
  "WatcherDeviation", "WatcherSignalDeviation", "WorkloadStatus",
  METRIC_NAME // Add custom metric name to exclusions
];

// Example geographic region-based cost center patterns
// Replace with your organization's actual patterns
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'},
  { pattern: 'REGION1 .*', value: 'region_a'},
  { pattern: 'REGION2 .*', value: 'region_b'}
];

const REGION = "EU"; // "US" or "EU"

// Enhanced API endpoint configuration
let gqlApiEndpoint;
let metricApiEndpoint;
if (REGION === "US") {
  gqlApiEndpoint = "https://api.newrelic.com/graphql";
  metricApiEndpoint = "https://metric-api.newrelic.com/metric/v1";
} else {
  gqlApiEndpoint = "https://api.eu.newrelic.com/graphql";
  metricApiEndpoint = "https://metric-api.eu.newrelic.com/metric/v1";
}

const GRAPH_API = gqlApiEndpoint;
const METRIC_API = metricApiEndpoint;
const HEADERS = { 'Content-Type': 'application/json', 'Api-Key': API_KEY };

// Enhanced request configuration with rate limiting and retries
const REQUEST_CONFIG = {
  timeout: {
    request: 60000,  // 60 second request timeout
    connect: 10000,  // 10 second connection timeout
  },
  retry: {
    limit: 3,
    methods: ['GET', 'POST'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
    errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']
  }
};

// Rate limiting configuration
const RATE_LIMIT = {
  maxConcurrentRequests: 20,
  requestsPerSecond: 25,
  burstLimit: 20,
  accountDelay: 100,
  keysetDelay: 50,
  ingestDelay: 25
};

let lastRequestTime = 0;
let activeRequests = 0;
let requestTimestamps = [];

async function rateLimitedRequest(requestFn) {
  const startTime = Date.now();
  
  // Clean up old requests
  requestTimestamps = requestTimestamps.filter(timestamp => startTime - timestamp < 30000);
  activeRequests = requestTimestamps.length;
  
  // Wait if at limit
  let waitCount = 0;
  while (activeRequests >= RATE_LIMIT.maxConcurrentRequests) {
    waitCount++;
    console.debug(`At concurrent request limit (${activeRequests}/${RATE_LIMIT.maxConcurrentRequests}), waiting...`);
    
    if (waitCount > 50) {
      console.warn(`Rate limit wait timeout, forcing cleanup. Active: ${activeRequests}`);
      requestTimestamps = requestTimestamps.filter(timestamp => startTime - timestamp < 5000);
      activeRequests = requestTimestamps.length;
      waitCount = 0;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(timestamp => now - timestamp < 30000);
    activeRequests = requestTimestamps.length;
  }
  
  requestTimestamps.push(startTime);
  activeRequests++;
  
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    console.error(`Request failed:`, error.message);
    throw error;
  } finally {
    const requestIndex = requestTimestamps.indexOf(startTime);
    if (requestIndex !== -1) {
      requestTimestamps.splice(requestIndex, 1);
    }
    activeRequests = Math.max(0, activeRequests - 1);
  }
}

const sleep = (milliseconds) => {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
};

/**
 * Apply cost center patterns to determine the actual cost center
 */
function applyCostCenterPatterns(facetValue) {
  if (!facetValue || costCenterPatterns.length === 0) {
    return facetValue;
  }
  
  for (const patternConfig of costCenterPatterns) {
    try {
      const regex = new RegExp(patternConfig.pattern, 'i');
      if (regex.test(facetValue)) {
        console.debug(`Pattern matched: ${patternConfig.pattern} -> ${patternConfig.value}`);
        return patternConfig.value;
      }
    } catch (error) {
      console.warn(`Invalid regex pattern: ${patternConfig.pattern}`, error);
    }
  }
  
  return facetValue;
}

/**
 * Check if data type should be assigned to a specific team
 */
function getDataTypeTeam(dataType) {
  return DATA_TYPE_TEAM_MAPPING[dataType] || null;
}

/**
 * Match lambda function name patterns to teams
 */
function getLambdaTeamFromName(functionName) {
  if (!functionName) return null;
  
  for (const [pattern, team] of Object.entries(LAMBDA_TEAM_MAPPING)) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(functionName)) {
        console.debug(`Lambda pattern matched: ${pattern} -> ${team}`);
        return team;
      }
    } catch (error) {
      console.warn(`Invalid lambda pattern: ${pattern}`, error);
    }
  }
  
  return null;
}

/**
 * Get fallback attributes to try based on data type
 */
function getFallbackStrategy(dataType) {
  if (DATA_TYPE_TEAM_MAPPING[dataType] === 'mobile-team') {
    return FALLBACK_STRATEGIES.mobile_data || FALLBACK_STRATEGIES.default;
  }
  
  const standardDataTypes = [
    'Transaction', 'TransactionError', 'PageView', 'PageAction', 'JavaScriptError',
    'SystemSample', 'ProcessSample', 'StorageSample', 'NetworkSample',
    'MobileSession', 'MobileCrash', 'MobileRequest', 'Metric'
  ];
  
  if (!standardDataTypes.includes(dataType)) {
    return FALLBACK_STRATEGIES.custom_events || FALLBACK_STRATEGIES.default;
  }
  
  return FALLBACK_STRATEGIES.default;
}

/**
 * Enhanced cost center determination with team mapping logic
 */
function determineTeamWithMapping(result, facetString, entityNameString, appNameString, dataType) {
  // First, check if this data type should be hardcoded to a specific team
  const dataTypeTeam = getDataTypeTeam(dataType);
  if (dataTypeTeam) {
    console.debug(`Data type ${dataType} assigned to team: ${dataTypeTeam}`);
    return dataTypeTeam;
  }
  
  let team = null;
  
  // Try primary facet first
  if (result.facet) {
    team = result.facet;
    console.debug(`Using primary facet for team: ${team}`);
  } else {
    // If no primary facet, try fallback strategies
    const fallbackAttributes = getFallbackStrategy(dataType);
    
    for (const attribute of fallbackAttributes) {
      let value = null;
      
      if (attribute === 'entity.name' && entityNameString && result['entity.name']) {
        value = result['entity.name'];
      } else if (attribute === 'appName' && appNameString && result['appName']) {
        value = result['appName'];
      } else if ((attribute === 'lambda_function_name' || attribute === 'functionName') && result[attribute]) {
        value = result[attribute];
        
        // Try lambda team mapping
        const lambdaTeam = getLambdaTeamFromName(value);
        if (lambdaTeam) {
          console.debug(`Lambda function ${value} mapped to team: ${lambdaTeam}`);
          return lambdaTeam;
        }
      }
      
      if (value) {
        team = value;
        console.debug(`Using fallback attribute ${attribute} for team: ${team}`);
        break;
      }
    }
  }
  
  // Apply pattern matching if we have a value
  if (team) {
    team = applyCostCenterPatterns(team);
  }
  
  return team || 'n/a';
}

async function getAccounts() {
  let q = `{
    actor {
      accounts {
        id
        name
        reportingEventTypes
      }
    }
  }`;

  let opts = {
    url: GRAPH_API,
    headers: HEADERS,
    json: { 'query': q, 'variables': {} },
    ...REQUEST_CONFIG
  };

  try {
    console.log('Fetching accounts...');
    const resp = await rateLimitedRequest(() => got.post(opts).json());
    if (resp.errors) {
      throw new Error(`GraphQL Error: ${resp.errors[0].message}`);
    }
    console.log(`Found ${resp.data.actor.accounts.length} accounts`);
    return resp.data.actor.accounts;
  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    throw error;
  }
}

async function getKeySet(eventType, acct) {
  let nrql = `SELECT keyset() FROM ${eventType} since 1 day ago`;
  let q = `{
    actor {
      account(id: ${acct.id}) {
        nrql(query: "${nrql}", timeout: 30) {
          results
        }
      }
    }
  }`;

  let opts = {
    url: GRAPH_API,
    headers: HEADERS,
    json: { 'query': q, 'variables': {} },
    ...REQUEST_CONFIG
  };
  
  let keySet = [];
  let anEventType = null;

  try {
    console.debug(`Fetching keyset for ${eventType} in account ${acct.name}`);
    const resp = await rateLimitedRequest(() => got.post(opts).json());
    
    if (resp !== undefined) {
      if (!resp.errors) {
        if (resp.data.actor.account.nrql.results.length > 0) {
          keySet = resp.data.actor.account.nrql.results;
          anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
          return anEventType;
        }
      } else {
        console.log('Fetch KeySet error: ' + resp.errors[0].message);
        anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
        return anEventType;
      }
    } else {
      console.log(`Undefined response for keyset ${eventType}`);
      anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
      return anEventType;
    }
  } catch (error) {
    console.error(`Error getting keyset for ${eventType} in account ${acct.name}:`, error.message);
    anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
    return anEventType;
  }
}

/**
 * Example A: Geographic Region-based Cost Distribution Configuration
 * 
 * This example shows how to configure the main enhanced script (cost-distribution-synthetics-api-script.js)
 * for geographic region-based cost allocation using entity name pattern matching.
 * 
 * RECOMMENDATION: Use the main enhanced script with the configuration shown below
 * instead of maintaining separate script versions.
 * 
 * Configuration for cost-distribution-synthetics-api-script.js:
 */

/* 
// ============================================================================
// CONFIGURATION FOR GEOGRAPHIC REGIONS
// Copy these settings into cost-distribution-synthetics-api-script.js
// ============================================================================

// Core Settings
var FACET = 'costcenter';
var METRIC_NAME = 'ingest.org_a';  // Replace 'org_a' with your organization identifier
var TIME_RANGE = '30 minutes';
var USE_FALLBACK_FACETS = true;  // Enable fallback to entity.name for pattern matching
const REGION = "EU";  // "US" or "EU" - replace with your region

// Keep default team mappings or customize as needed
const DATA_TYPE_TEAM_MAPPING = {
  // Mobile data types → mobile-team (or customize team names)
  'MobileSession': 'mobile-team',
  'MobileCrash': 'mobile-team', 
  'MobileRequest': 'mobile-team',
  
  // Infrastructure, APM, Browser data types → platform-team (or customize)
  'SystemSample': 'platform-team',
  'Transaction': 'platform-team',
  'PageView': 'platform-team',
  // ... (use defaults or add more mappings)
};

// Geographic region patterns for entity names
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'},
  { pattern: 'REGION1 .*', value: 'region_a'},
  { pattern: 'REGION2 .*', value: 'region_b'},
  { pattern: 'prod-eu-.*', value: 'europe'},
  { pattern: 'prod-us-.*', value: 'americas'},
  { pattern: 'prod-apac-.*', value: 'asia_pacific'}
];

// Optional: Lambda function patterns for regional teams
const LAMBDA_TEAM_MAPPING = {
  'region1-*': 'region_a',
  'region2-*': 'region_b',
  '*-region1-*': 'region_a',
  '*-region2-*': 'region_b',
  'eu-*': 'europe',
  'us-*': 'americas',
  'apac-*': 'asia_pacific'
};

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

1. Copy the enhanced script: cost-distribution-synthetics-api-script.js
2. Replace the configuration section with the settings above
3. Customize the patterns to match your entity naming conventions
4. Update region and metric naming as needed
5. Deploy to your Synthetics environment

// ============================================================================
// BENEFITS OF USING THE ENHANCED SCRIPT
// ============================================================================

✅ Performance optimizations for Synthetics 3-minute limit
✅ Enhanced rate limiting with automatic cleanup
✅ Comprehensive error handling and recovery
✅ Advanced team mapping capabilities
✅ Parallel processing for faster execution
✅ Enhanced debugging and logging
✅ Future-proof with ongoing improvements

// ============================================================================
// TERRAFORM CONFIGURATION
// ============================================================================

Update your terraform.tfvars to match:

cost_facet = "costcenter"     # Must match FACET variable
metric_name = "ingest.org_a"  # Must match METRIC_NAME variable

*/

// ============================================================================
// DEPRECATED: This file previously contained a full script implementation
// RECOMMENDATION: Use cost-distribution-synthetics-api-script.js with the
// configuration shown above for better performance and reliability
// ============================================================================

console.log(`
🔄 NOTICE: This example script has been updated to show configuration only.

✅ RECOMMENDED APPROACH:
   Use 'cost-distribution-synthetics-api-script.js' with the configuration shown above.
   
🚀 BENEFITS:
   - Enhanced performance for Synthetics
   - Better error handling and rate limiting  
   - Advanced team mapping capabilities
   - Future-proof with ongoing improvements
   
📖 See CONFIGURATION.md for complete setup instructions.
`);

// Prevent execution of this deprecated script
if (typeof $env !== "undefined" && $env !== null) {
  throw new Error("Please use cost-distribution-synthetics-api-script.js with the configuration shown above");
}
