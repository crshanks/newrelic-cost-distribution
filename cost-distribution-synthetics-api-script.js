/**
 * New Relic Cost Distribution - Enhanced Team Allocation Version
 * Incorporates advanced team mapping and configuration-based assignment
 * Designed for New Relic Synthetics Scripted API monitoring
 * 
 * Features:
 * - Environment Detection & Local Development Support
 * - Enhanced Team/Cost Center Pattern Matching
 * - Data Type to Team Mapping (configurable for organizational structures)
 * - Lambda Function Name Pattern Matching
 * - Regional API Support
 * - Configurable fallback facet behavior with intelligent strategies
 * - Enhanced error handling with team assignment fallbacks
 * - Configurable exclusions and debugging
 * - Customer-specific pattern matching for complex organizational structures
 * 
 * Common Use Cases:
 * - Tags-based team identification (e.g., tags.Team)
 * - Mobile data automatically assigned to designated mobile team
 * - Infrastructure, APM, Browser data assigned to platform/operations team
 * - Lambda functions mapped to teams via name patterns
 * - Custom events without tags use lambda function names for team mapping
 */

const got = require('got');

// ============================================================================
// CONFIGURATION SECTION - CUSTOMIZE FOR YOUR ENVIRONMENT
// ============================================================================

const IS_LOCAL_ENV = typeof $env === "undefined" || $env === null;

// Comment the following lines to enable debug messages
//console.log = function() {}
//console.debug = function() {}

/**
 * For local development - uncomment and configure as needed
 */
if (IS_LOCAL_ENV) {
  global._isApiTest = true;
  
  // Mock $secure for local testing
  global.$secure = {
    COST_DISTRIBUTION_USER_API_KEY: "NRAK-YOUR_USER_API_KEY_HERE",
    COST_DISTRIBUTION_INGEST_KEY: "YOUR_INGEST_KEY_HERE"
  };
}

/* -------------------MAIN CONFIGURATION-------------------------------------- */
// API Keys - Use secure credentials in Synthetics
var API_KEY = $secure.COST_DISTRIBUTION_USER_API_KEY;
var INGEST_KEY = $secure.COST_DISTRIBUTION_INGEST_KEY;

// Core Settings
var FACET = 'costcenter'; // Attribute to facet ingest by
var METRIC_NAME = 'ingest'; // Name of the metric to create
var TIME_RANGE = '30 minutes'; // Time range for data collection

// Fallback Behavior Configuration
var USE_FALLBACK_FACETS = true; // Set to true to use entity.name and appName fallbacks, false to use only primary facet or 'n/a'

// Lambda Team Inference Configuration
var ENABLE_LAMBDA_TEAM_INFERENCE = false; // Set to true to infer team assignments from lambda function names for custom events
var LAMBDA_INFERENCE_LOGGING = false; // Enable detailed logging for lambda team inference

// ============================================================================
// ENHANCED CONFIGURATION - Team/Cost Center Mapping
// ============================================================================

// Data Type to Team Mapping - for hardcoded team assignments
const DATA_TYPE_TEAM_MAPPING = {
  // Mobile data types → mobile-team
  'Mobile': 'mobile-team',
  'MobileApplicationExit': 'mobile-team',
  'MobileBreadcrumb': 'mobile-team',
  'MobileCrash': 'mobile-team',
  'MobileHandledException': 'mobile-team',
  'MobilePerformance': 'mobile-team',
  'MobileRequest': 'mobile-team',
  'MobileRequestError': 'mobile-team',
  'MobileSession': 'mobile-team',
  'MobileUserAction': 'mobile-team',
  
  // Infrastructure, APM, Browser data types → platform-team
  'ContainerSample': 'platform-team',
  'InfrastructureEvent': 'platform-team',
  'NetworkSample': 'platform-team',
  'ProcessSample': 'platform-team',
  'StorageSample': 'platform-team',
  'SystemSample': 'platform-team',
  'Transaction': 'platform-team',
  'TransactionError': 'platform-team',
  'TransactionTrace': 'platform-team',
  'AjaxRequest': 'platform-team',
  'BrowserInteraction': 'platform-team',
  'BrowserPerformance': 'platform-team',
  'BrowserTiming': 'platform-team',
  'JavaScriptError': 'platform-team',
  'PageAction': 'platform-team',
  'PageView': 'platform-team',
  'PageViewTiming': 'platform-team',
};

// Lambda Function Name to Team Mapping - for AWS/Lambda function patterns
const LAMBDA_TEAM_MAPPING = {
  // Generic team prefix patterns
  'team-alpha-*': 'team-alpha',
  'team-beta-*': 'team-beta',
  
  // Common functional patterns
  'mobile-*': 'mobile-team',
  '*-mobile': 'mobile-team',
  '*-mobile-*': 'mobile-team',
  
  // Generic service patterns
  'analytics-*': 'data-team',
  '*-analytics': 'data-team',
  'platform-*': 'platform-team',
  '*-platform': 'platform-team',
  
  // API and service patterns
  '*api*': 'platform-team',
  '*service*': 'platform-team',
  
  // Add your organization's lambda naming patterns here
  // Examples:
  // 'your-prefix-*': 'your-team',
  // '*-your-suffix': 'your-team',
};

// Custom Event Team Mapping - Static configuration for reliable team assignments
// This takes precedence over lambda function inference
const CUSTOM_EVENT_TEAM_MAPPING = {
  // Example static mappings for custom events
  // 'my-custom-event-alpha': 'team-alpha',
  // 'my-custom-event-beta': 'team-beta',
  // 'order-processing-metrics': 'platform-team',
  // 'mobile-analytics-events': 'mobile-team',
  
  // Add your organization's custom event to team mappings here
  // Format: 'eventName': 'teamName'
};

// Fallback Strategy Configuration - what to try when primary facet is missing
const FALLBACK_STRATEGIES = {
  // For custom events without tags, try these attributes in order
  'custom_events': ['entity.name', 'appName', 'lambda_function_name', 'functionName'],
  // For mobile data, try these attributes
  'mobile_data': ['appName', 'appName', 'entity.name'],
  // Default fallback chain for other data types
  'default': ['entity.name', 'appName', 'host', 'hostname']
};

// Regional Configuration
const REGION = "US"; // "US" or "EU"

// Customer-Specific Settings Examples (uncomment and modify as needed)
// Example A: Tags-based team allocation (Customer request):
// var FACET = 'tags.Team';
// var METRIC_NAME = 'ingest.team_allocation';
// var USE_FALLBACK_FACETS = false; // Use data type mappings for missing tags
// // Update DATA_TYPE_TEAM_MAPPING to use customer team names like 'voltron'
// const REGION = "US";

// Example B: Cost center attribute with lambda mapping:
// var FACET = 'Cost Center';
// var METRIC_NAME = 'ingest.cost_center';
// var USE_FALLBACK_FACETS = true; // Use lambda function name patterns
// const REGION = "EU";

// Example C: Service namespace with strict mode:
// var FACET = 'service.namespace';
// var METRIC_NAME = 'ingest.service_allocation';
// var USE_FALLBACK_FACETS = false; // Strict mode: only use primary facet or mapped values
// const REGION = "US";

// Event Types to Exclude from Cost Calculation
var excludedEventTypes = [
  "AuditLog",
  "ActivityEvent",
  "AgentUpdate",
  "ApplicationAgentContext",
  "CorrelationTriggered",
  "CorrelationTriggeredV2",
  "EntityAudits",
  "DistributedTraceSummary",
  "NrAiAnomaly",
  "NrAiIncident",
  "NrAiIssue",
  "NrAiNotification",
  "NrAiSignal",
  "NrAiInternalIncident",
  "NrAiInternalIssue",
  "NrAuditEvent",
  "NrComputeUsage",
  "NrConsumption",
  "NrIntegrationError",
  "NrMTDConsumption",
  "NrNotificationsEvent",
  "NrDailyUsage",
  "NrUsage",
  "NrdbQuery",
  "IntegrationDataFreshnessReport",
  "IntegrationProviderReport",
  "IssueActivated",
  "IssueCreated",
  "IssueClosed",
  "IssueMerged",
  "Public_APICall",
  "Relationship",
  "SyntheticsPrivateLocationStatus",
  "SyntheticsPrivateMinion",
  "SyntheticCheck",
  "SyntheticRequest",
  "WatcherDeviation",
  "WatcherSignalDeviation",
  "WorkloadStatus",
  // Add custom metric name to exclusions
  METRIC_NAME
];

// Cost Center Pattern Matching - Entity name patterns to cost center mappings
const costCenterPatterns = [
  // Example A: Geographic region patterns (uncomment if needed)
  // { pattern: '.*-region1-.*', value: 'region_a'},
  // { pattern: '.*-region2-.*', value: 'region_b'},
  
  // Example B: Environment patterns (uncomment if needed)
  // { pattern: 'prod-.*', value: 'production'},
  // { pattern: 'dev-.*', value: 'development'},
  // { pattern: 'test-.*', value: 'testing'}
  
  // Add your organization's patterns here
];

/* -------------------END CONFIGURATION-------------------------------------- */

// ============================================================================
// API ENDPOINT CONFIGURATION
// ============================================================================

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
  },
  hooks: {
    beforeRetry: [
      (error, retryCount) => {
        console.log(`Retrying request (attempt ${retryCount + 1}): ${error.message}`);
        // Exponential backoff for rate limiting
        if (error.response && error.response.statusCode === 429) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Rate limited, waiting ${backoffTime}ms before retry`);
          sleep(backoffTime);
        }
      }
    ]
  }
};

// Rate limiting configuration - OPTIMIZED FOR SYNTHETICS 3-MINUTE LIMIT
const RATE_LIMIT = {
  maxConcurrentRequests: 20,  // Reduced from 24 to be more conservative
  requestsPerSecond: 25,      // Significantly increased for Synthetics time constraint
  burstLimit: 20,             // Reduced to match maxConcurrentRequests
  accountDelay: 100,          // Drastically reduced delays for speed
  keysetDelay: 50,            
  ingestDelay: 25             
};

// Rate limiting helper - IMPROVED ERROR HANDLING
let lastRequestTime = 0;
let activeRequests = 0;
let requestTimestamps = []; // Track individual request timestamps for better cleanup

async function rateLimitedRequest(requestFn) {
  const startTime = Date.now();
  
  // Clean up old requests that may have gotten stuck (older than 30 seconds)
  requestTimestamps = requestTimestamps.filter(timestamp => startTime - timestamp < 30000);
  activeRequests = requestTimestamps.length;
  
  // Wait if we're at the concurrent request limit
  let waitCount = 0;
  while (activeRequests >= RATE_LIMIT.maxConcurrentRequests) {
    waitCount++;
    console.debug(`At concurrent request limit (${activeRequests}/${RATE_LIMIT.maxConcurrentRequests}), waiting... (${waitCount})`);
    
    // If we've been waiting too long, force cleanup
    if (waitCount > 50) { // 50 * 100ms = 5 seconds
      console.warn(`Rate limit wait timeout, forcing cleanup. Active: ${activeRequests}`);
      requestTimestamps = requestTimestamps.filter(timestamp => startTime - timestamp < 5000); // Keep only very recent
      activeRequests = requestTimestamps.length;
      waitCount = 0;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Increased wait time for stability
    
    // Re-check after waiting
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(timestamp => now - timestamp < 30000);
    activeRequests = requestTimestamps.length;
  }
  
  // Add current request timestamp
  requestTimestamps.push(startTime);
  activeRequests++;
  lastRequestTime = startTime;
  
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    console.error(`Request failed:`, error.message);
    throw error;
  } finally {
    // Remove this request's timestamp
    const requestIndex = requestTimestamps.indexOf(startTime);
    if (requestIndex !== -1) {
      requestTimestamps.splice(requestIndex, 1);
    }
    activeRequests = Math.max(0, activeRequests - 1);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
        console.debug(`Pattern matched: ${facetValue} -> ${patternConfig.value}`);
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
    // Convert pattern to regex - escape dots first, then convert * to .*
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape actual dots
      .replace(/\*/g, '.*');  // Replace * with .* for wildcard matching
    
    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(functionName)) {
        console.debug(`Lambda pattern matched: ${functionName} -> ${team}`);
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
  // Check if it's a mobile data type
  if (DATA_TYPE_TEAM_MAPPING[dataType] === 'mobile-team') {
    return FALLBACK_STRATEGIES.mobile_data || FALLBACK_STRATEGIES.default;
  }
  
  // Check if it's a custom event (not in standard New Relic data types)
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
 * Enhanced cost center determination with team mapping logic and lambda inference
 */
function determineTeamWithMapping(result, facetString, entityNameString, appNameString, dataType, lambdaTeamMappings = null) {
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
    // Check if this is a custom event and try lambda inference
    if (isCustomEventType(dataType)) {
      const customEventTeam = determineCustomEventTeam(dataType, lambdaTeamMappings);
      if (customEventTeam) {
        console.debug(`Custom event ${dataType} assigned to team via lambda inference: ${customEventTeam}`);
        return customEventTeam;
      }
    }
    
    // If no primary facet, try fallback strategies
    const fallbackAttributes = getFallbackStrategy(dataType);
    
    for (const attribute of fallbackAttributes) {
      let value = null;
      
      // Try to get the attribute value from the result
      if (attribute === 'entity.name' && entityNameString && result['entity.name']) {
        value = result['entity.name'];
      } else if (attribute === 'appName' && appNameString && result['appName']) {
        value = result['appName'];
      } else if (result[attribute]) {
        value = result[attribute];
      }
      
      if (value) {
        console.debug(`Using fallback attribute ${attribute}: ${value}`);
        
        // Check if it's a lambda function name and try to map it
        if (attribute.includes('lambda') || attribute.includes('function')) {
          const lambdaTeam = getLambdaTeamFromName(value);
          if (lambdaTeam) {
            return lambdaTeam;
          }
        }
        
        team = value;
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

/**
 * Lambda Team Inference Functions - for mapping custom events to teams based on lambda function names
 */

/**
 * Infer team from lambda function name mapping (exact and fuzzy matching)
 */
function inferTeamFromLambdaMapping(customEventName, lambdaTeamMappings) {
  if (!ENABLE_LAMBDA_TEAM_INFERENCE || !customEventName) {
    return null;
  }

  // Use the static LAMBDA_TEAM_MAPPING configuration for pattern matching
  for (const [pattern, team] of Object.entries(LAMBDA_TEAM_MAPPING)) {
    if (matchesWildcardPattern(customEventName, pattern)) {
      if (LAMBDA_INFERENCE_LOGGING) {
        console.log(`🔗 Lambda inference (pattern): ${customEventName} matches ${pattern} → ${team}`);
      }
      return team;
    }
  }
  
  return null;
}

/**
 * Helper function to match a string against a wildcard pattern
 * Supports * as wildcard character
 */
function matchesWildcardPattern(str, pattern) {
  if (!str || !pattern) return false;
  
  // Convert wildcard pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*/g, '.*'); // Convert * to .*
  
  const regex = new RegExp('^' + regexPattern + '$');
  return regex.test(str.toLowerCase());
}

/**
 * Determine team assignment for custom events using hybrid approach
 * Priority: Static config → Lambda inference → Default
 */
function determineCustomEventTeam(eventName, lambdaTeamMappings) {
  // 1. Check static configuration first (most reliable)
  if (CUSTOM_EVENT_TEAM_MAPPING[eventName]) {
    const team = CUSTOM_EVENT_TEAM_MAPPING[eventName];
    if (LAMBDA_INFERENCE_LOGGING) {
      console.log(`📋 Static config: ${eventName} → ${team}`);
    }
    return team;
  }
  
  // 2. Try lambda function inference
  const inferredTeam = inferTeamFromLambdaMapping(eventName, lambdaTeamMappings);
  if (inferredTeam) {
    return inferredTeam;
  }
  
  // 3. Log that no mapping was found
  if (LAMBDA_INFERENCE_LOGGING) {
    console.log(`❌ No team mapping found for custom event: ${eventName}`);
  }
  
  // 4. Fallback to default
  return null; // Let the calling function handle the fallback
}

/**
 * Check if an event type is considered a custom event
 */
function isCustomEventType(eventType) {
  const standardDataTypes = [
    'Transaction', 'TransactionError', 'PageView', 'PageAction', 'JavaScriptError',
    'SystemSample', 'ProcessSample', 'StorageSample', 'NetworkSample', 'ContainerSample',
    'MobileSession', 'MobileCrash', 'MobileRequest', 'MobileRequestError', 'MobileHandledException',
    'AwsLambdaInvocation', 'AwsLambdaInvocationError', 'InfrastructureEvent',
    'BrowserInteraction', 'BrowserTiming', 'PageViewTiming', 'Metric', 'Log'
  ];
  
  // Remove backticks from event type name for comparison
  const cleanEventType = eventType.replace(/`/g, '');
  
  // Check if it's a standard New Relic event type
  return !standardDataTypes.some(standardType => 
    cleanEventType === standardType || 
    cleanEventType.toLowerCase() === standardType.toLowerCase()
  );
}

/**
 * Determine cost center from NRQL result, applying patterns and fallbacks
 */
function determineCostCenter(result, facetString, entityNameString, appNameString) {
  let costCenter = null;
  
  // Try primary facet first
  if (result.facet) {
    costCenter = result.facet;
  }
  // Only use fallbacks if configured to do so
  else if (USE_FALLBACK_FACETS) {
    // Try entity.name if available and no facet
    if (entityNameString && result['entity.name']) {
      costCenter = result['entity.name'];
      console.debug(`Using entity.name fallback: ${costCenter}`);
    }
    // Try appName if available and no other options
    else if (appNameString && result['appName']) {
      costCenter = result['appName'];
      console.debug(`Using appName fallback: ${costCenter}`);
    }
  }
  
  // Apply pattern matching if we have a value
  if (costCenter) {
    costCenter = applyCostCenterPatterns(costCenter);
  }
  
  return costCenter || 'n/a';
}

// ============================================================================
// NEW RELIC API FUNCTIONS
// ============================================================================

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
    if (error.response && error.response.statusCode === 429) {
      console.error('Rate limit exceeded. Consider reducing concurrent requests.');
    }
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
        console.log(`Fetch KeySet error for ${eventType}: ${resp.errors[0].message}`);
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
    
    if (error.response && error.response.statusCode === 429) {
      console.log(`Rate limited on ${eventType}, returning empty keyset`);
    }
    
    anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
    return anEventType;
  }
}

function getIngest(facet, entityName, appName, dataType, acctid, acctname, lambdaTeamMappings = null) {
  return new Promise(async (resolve, reject) => {
    
    // Build metric exclusion clause for Metric event types. If it is a Metric then don't count the goldenMetrics
    let metricClause = dataType === 'Metric' ? ` where metricName != '${METRIC_NAME}' and newrelic.source != \`goldenMetrics\`` : '';
    
    // Build facet clause based on available attributes and fallback configuration
    let facetClause;
    if (facet != null) {
      facetClause = ` facet \`${facet}\``;
    } else if (USE_FALLBACK_FACETS && entityName != null) {
      facetClause = ` facet entity.name`;
    } else if (USE_FALLBACK_FACETS && appName != null) {
      facetClause = ` facet appName`;
    } else {
      facetClause = '';
    }

    // Build enhanced NRQL query that includes potential team mapping attributes
    let baseQuery = `SELECT bytecountestimate()`;
    
    // Note: We don't add additional attributes to SELECT as they may not exist in all event types
    // Instead, we rely on the keyset detection mechanism to determine available attributes
    // and use them in the team mapping logic when processing results
    
    let nrql = baseQuery + ` FROM ${dataType}` + metricClause + ` since ${TIME_RANGE} ago` + facetClause + ` LIMIT MAX`;

    let q = `{
      actor {
        account(id: ${acctid}) {
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
    
    let ingestResult = [];
    let metricsResult = [{ 'metrics': [] }];
    let now = new Date().valueOf();

    try {
      console.debug(`Fetching ingest for ${dataType} in account ${acctname}`);
      const resp = await rateLimitedRequest(() => got.post(opts));
      const jsonResp = JSON.parse(resp.body);
      
      if (resp !== undefined) {
        if (resp.statusCode == 200) {
          if (!jsonResp.errors) {
            if (jsonResp.data.actor.account.nrql.results.length > 0) {
              ingestResult = jsonResp.data.actor.account.nrql.results;
              
              // Debug: Log the first result to see the structure
              console.debug(`NRQL result structure for ${dataType}:`, JSON.stringify(ingestResult[0], null, 2));
              console.debug(`Available properties for ${dataType}:`, Object.keys(ingestResult[0]));
              
              let isFacetPresent = ingestResult.some(i => Object.keys(i).includes('facet'));
              
              if (!isFacetPresent) {
                // No facet data - single aggregated result
                // Enhanced: Try all possible property names and log what we find
                const result = ingestResult[0];
                let metricValue = 0;
                let foundProperty = null;
                
                // Try different possible property names
                const possibleProperties = [
                  'bytecountestimate',
                  'bytecountestimate()',
                  'count',
                  'sum',
                  'value'
                ];
                
                for (const prop of possibleProperties) {
                  if (result[prop] !== undefined && result[prop] !== null) {
                    metricValue = result[prop];
                    foundProperty = prop;
                    break;
                  }
                }
                
                console.debug(`Property search for ${dataType}: found '${foundProperty}' = ${metricValue}`);
                
                // If still no value found, try to find any numeric property
                if (metricValue === 0 && foundProperty === null) {
                  for (const [key, value] of Object.entries(result)) {
                    if (typeof value === 'number' && value > 0) {
                      metricValue = value;
                      foundProperty = key;
                      console.debug(`Found numeric property '${key}' = ${value} for ${dataType}`);
                      break;
                    }
                  }
                }
                
                console.debug(`Final extracted metric value: ${metricValue} for ${dataType} (non-faceted)`);
                
                // Check if this data type should be assigned to a specific team
                let teamValue = getDataTypeTeam(dataType);
                
                // Enhanced: Try lambda inference if no team found and enabled
                if ((!teamValue || teamValue === 'n/a') && ENABLE_LAMBDA_TEAM_INFERENCE && lambdaTeamMappings) {
                  console.debug(`🔧 Attempting lambda inference for non-faceted event: ${dataType}`);
                  const customEventTeam = determineCustomEventTeam(dataType, lambdaTeamMappings);
                  if (customEventTeam && customEventTeam !== 'n/a') {
                    teamValue = customEventTeam;
                    console.log(`🔗 Lambda inference assigned team: ${teamValue} for non-faceted event: ${dataType}`);
                  }
                }
                
                teamValue = teamValue || 'n/a';
                console.debug(`No facet data for ${dataType}, using team assignment: ${teamValue}`);
                
                metricsResult[0]['metrics'].push({ 
                  'name': METRIC_NAME, 
                  'type': 'gauge', 
                  'value': metricValue, 
                  'timestamp': now, 
                  'attributes': { 
                    [FACET]: teamValue, 
                    'account': acctname, 
                    'id': acctid, 
                    'table': dataType 
                  } 
                });
              } else {
                // Process faceted results
                for (let z = 0; z < ingestResult.length; z++) {
                  const costCenter = determineTeamWithMapping(ingestResult[z], facet, entityName, appName, dataType, lambdaTeamMappings);
                  
                  // Enhanced: Try all possible property names and log what we find
                  const result = ingestResult[z];
                  let metricValue = 0;
                  let foundProperty = null;
                  
                  // Try different possible property names
                  const possibleProperties = [
                    'bytecountestimate',
                    'bytecountestimate()',
                    'count',
                    'sum',
                    'value'
                  ];
                  
                  for (const prop of possibleProperties) {
                    if (result[prop] !== undefined && result[prop] !== null) {
                      metricValue = result[prop];
                      foundProperty = prop;
                      break;
                    }
                  }
                  
                  console.debug(`Property search for ${dataType}[${z}]: found '${foundProperty}' = ${metricValue}`);
                  
                  // If still no value found, try to find any numeric property
                  if (metricValue === 0 && foundProperty === null) {
                    for (const [key, value] of Object.entries(result)) {
                      if (typeof value === 'number' && value > 0 && key !== 'facet') {
                        metricValue = value;
                        foundProperty = key;
                        console.debug(`Found numeric property '${key}' = ${value} for ${dataType}[${z}]`);
                        break;
                      }
                    }
                  }
                  
                  console.debug(`Final extracted metric value: ${metricValue} for ${dataType}, team: ${costCenter}`);
                  
                  metricsResult[0]['metrics'].push({ 
                    'name': METRIC_NAME, 
                    'type': 'gauge', 
                    'value': metricValue, 
                    'timestamp': now, 
                    'attributes': { 
                      [FACET]: costCenter, 
                      'account': acctname, 
                      'id': acctid, 
                      'table': dataType 
                    } 
                  });
                  
                  console.log('Cost center: ' + costCenter + ', dataType: ' + dataType + ', metricName: ' + METRIC_NAME + ', account: ' + acctname + ', value: ' + metricValue);
                }
              }
              resolve(metricsResult);
            } else {
              console.log('No ingest results returned for eventType: ' + dataType + ', in account: ' + acctname);
              resolve(metricsResult);
            }
          } else {
            console.log('Fetch Ingest error: ' + jsonResp.errors[0].message);
            resolve(metricsResult);
          }
        } else {
          console.log(`HTTP ${resp.statusCode} for ${dataType} in ${acctname}`);
          resolve(metricsResult);
        }
      } else {
        console.log('Undefined response-ingest');
        resolve(metricsResult);
      }
    } catch (error) {
      console.error(`Error in getIngest for ${dataType} in account ${acctname}:`, error.message);
      
      if (error.response && error.response.statusCode === 429) {
        console.log(`Rate limited on ingest query for ${dataType}, returning empty results`);
      }
      
      resolve(metricsResult);
    }
  });
}

async function writeAsMetrics(payload) {
  let h = {
    'Content-Type': 'application/json',
    'Api-Key': INGEST_KEY
  };
  
  let options = {
    url: METRIC_API,
    headers: h,
    json: payload,
    ...REQUEST_CONFIG
  };
  
  try {
    console.log(`Writing metrics to: ${METRIC_API}`);
    let resp = await got.post(options);
    if (resp.statusCode == 202) {
      return 'complete';
    } else {
      console.log('Error posting to NRDB ' + resp.statusCode);
      console.log(resp.body);
      return 'failed';
    }
  } catch (error) {
    console.error('Error writing metrics:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('Metric API connection timed out');
    }
    return 'failed';
  }
}

// ============================================================================
// PARALLEL PROCESSING FUNCTIONS FOR SYNTHETICS PERFORMANCE
// ============================================================================

/**
 * Process a single account in parallel
 */
async function processAccount(account) {
  console.log(`\n=== Processing Account: ${account.name} ===`);
  
  if (!account.reportingEventTypes || account.reportingEventTypes.length === 0) {
    console.log(`No reporting event types for account: ${account.name}`);
    return;
  }
  
  let eventTypes = account.reportingEventTypes.filter(et => !excludedEventTypes.includes(et));
  console.log(`Found ${eventTypes.length} event types (${account.reportingEventTypes.length - eventTypes.length} excluded)`);
  
  if (eventTypes.length === 0) {
    console.log(`All event types excluded for account: ${account.name}`);
    return;
  }
  
  // Initialize lambda team mapping collection for this account
  const lambdaTeamMappings = new Map();
  if (ENABLE_LAMBDA_TEAM_INFERENCE) {
    console.log(`🔗 Lambda team inference enabled for account: ${account.name}`);
    
    // Populate the Map with static LAMBDA_TEAM_MAPPING configuration
    for (const [pattern, team] of Object.entries(LAMBDA_TEAM_MAPPING)) {
      lambdaTeamMappings.set(pattern, team);
    }
    console.log(`🔗 Loaded ${lambdaTeamMappings.size} static lambda patterns for team inference`);
  }
  
  // Get all keysets in parallel
  const keysetPromises = eventTypes.map(eventString => {
    if (eventString.includes(":") || eventString.indexOf(' ') >= 0) {
      eventString = "`" + eventString + "`";
    }
    return getKeySet(eventString, account);
  });
  
  console.log(`Fetching ${keysetPromises.length} keysets in parallel for account: ${account.name}`);
  const keySetResults = await Promise.all(keysetPromises);
  
  // Process all ingest queries in parallel
  const ingestPromises = [];
  const escapedFacet = FACET.replace(/\s/g, '\\s');
  const pattern = `^${escapedFacet}$|^tag_.${escapedFacet}$|^tags.${escapedFacet}$|^label.${escapedFacet}$`;
  const regexp = new RegExp(pattern, 'i');
  
  // Phase 1: Lambda team inference uses static configuration only (no dynamic collection needed)
  if (ENABLE_LAMBDA_TEAM_INFERENCE) {
    console.log(`🔗 Lambda team inference ready with ${lambdaTeamMappings.size} patterns and ${Object.keys(CUSTOM_EVENT_TEAM_MAPPING).length} custom event mappings`);
  }
  
  // Phase 2: Process all data types (including AwsLambdaInvocation again for metric generation)
  for (const ks of keySetResults) {
    if (ks.keySet.length > 0) {
      // Check for the primary facet
      let facetExistsArray = ks.keySet.filter(r => r['key']?.match(regexp));
      let facetString = facetExistsArray.length > 0 ? facetExistsArray[0].key : null;
      
      // Enhanced debugging for AwsLambdaInvocation to help identify tags.Team issues
      if (ks.eventType === 'AwsLambdaInvocation') {
        console.log(`🔍 AwsLambdaInvocation debugging for ${ks.account}:`);
        console.log(`   Available keys: ${ks.keySet.map(k => k.key).slice(0, 10).join(', ')}${ks.keySet.length > 10 ? '...' : ''}`);
        console.log(`   Looking for FACET pattern: ${pattern}`);
        console.log(`   Found facet match: ${facetString}`);
        
        // Check specifically for team-related keys
        const teamKeys = ks.keySet.filter(k => k.key && k.key.toLowerCase().includes('team'));
        console.log(`   Team-related keys found: ${teamKeys.map(k => k.key).join(', ')}`);
        
        // Check specifically for tags keys
        const tagKeys = ks.keySet.filter(k => k.key && k.key.toLowerCase().includes('tag'));
        console.log(`   Tag-related keys found: ${tagKeys.map(k => k.key).join(', ')}`);
      }
      
      // Check for alternative facets if enabled
      let entityNameExistsArray = ks.keySet.filter(r => r['key'] === 'entity.name');
      let entityNameString = entityNameExistsArray.length > 0 ? entityNameExistsArray[0].key : null;
      
      let appNameExistsArray = ks.keySet.filter(r => r['key'] === 'appName');
      let appNameString = appNameExistsArray.length > 0 ? appNameExistsArray[0].key : null;
      
      console.debug(`Data type: ${ks.eventType}, Facet: ${facetString}, Entity: ${entityNameString}, App: ${appNameString}`);
      
      // Get the ingest data for the data type in the account with lambda team mappings
      ingestPromises.push(getIngest(facetString, entityNameString, appNameString, ks.eventType, ks.id, ks.account, lambdaTeamMappings));
    }
  }
  
  if (ingestPromises.length === 0) {
    console.log(`No ingest queries to execute for account: ${account.name}`);
    return;
  }
  
  console.log(`Waiting for ${ingestPromises.length} ingest queries to complete in parallel for account: ${account.name}`);
  const ingests = await Promise.all(ingestPromises);
  
  // Write all metrics for this account
  const metricsToWrite = [];
  for (const ing of ingests) {
    if (ing && ing.length > 0) {
      // Extract metrics from each result object
      for (const ingResult of ing) {
        if (ingResult.metrics && ingResult.metrics.length > 0) {
          metricsToWrite.push(...ingResult.metrics);
        }
      }
    }
  }
  
  if (metricsToWrite.length > 0) {
    console.log(`Writing ${metricsToWrite.length} metrics to NRDB for account: ${account.name}`);
    await writeAsMetrics([{ metrics: metricsToWrite }]);
  } else {
    console.log(`No metrics to write for account: ${account.name}`);
  }
}

/**
 * Process multiple accounts in parallel with concurrency limit
 */
async function processAccountsInParallel(accounts) {
  // Process up to 3 accounts simultaneously to stay within API limits
  const concurrency = 3;
  const results = [];
  
  for (let i = 0; i < accounts.length; i += concurrency) {
    const batch = accounts.slice(i, i + concurrency);
    console.log(`\nProcessing account batch ${Math.floor(i/concurrency) + 1}/${Math.ceil(accounts.length/concurrency)} (${batch.length} accounts)`);
    
    const batchPromises = batch.map(account => processAccount(account));
    await Promise.all(batchPromises);
    
    // Small delay between account batches
    if (i + concurrency < accounts.length) {
      console.log(`Waiting ${RATE_LIMIT.accountDelay}ms between account batches`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.accountDelay));
    }
  }
}

// ============================================================================
// MAIN EXECUTION LOGIC
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting OPTIMIZED cost distribution calculation for Synthetics`);
    console.log(`Region: ${REGION}, Facet: ${FACET}, Metric: ${METRIC_NAME}`);
    console.log(`Rate limiting: max concurrent: ${RATE_LIMIT.maxConcurrentRequests}, fallback facets: ${USE_FALLBACK_FACETS}`);
    
    // Get all accounts for the organization
    console.log('📡 Fetching accounts...');
    let accounts = await getAccounts();

    // If accounts exist, proceed with parallel processing
    if (accounts !== null && accounts.length > 0) {
      console.log(`🔄 Processing ${accounts.length} account(s) with PARALLEL execution for maximum speed`);
      
      // Process all accounts in parallel for maximum performance
      await processAccountsInParallel(accounts);
      
    } else {
      console.log('❌ No accounts found');
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Cost distribution calculation completed in ${executionTime} seconds`);
    
    if (executionTime > 180) { // 3 minutes
      console.warn(`⚠️  WARNING: Execution time (${executionTime}s) exceeds Synthetics 3-minute limit!`);
    } else {
      console.log(`✅ Execution time (${executionTime}s) is within Synthetics 3-minute limit`);
    }
    
  } catch (error) {
    console.error('💥 Error in main execution:', error);
    throw error;
  }
}

// Execute main function
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
