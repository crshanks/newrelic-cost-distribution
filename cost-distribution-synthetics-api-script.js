/**
 * New Relic Cost Distribution - Consolidated Synthetics Version
 * Incorporates all improvements from customer-specific versions
 * Designed for New Relic Synthetics Scripted API monitoring
 * 
 * Features:
 * - Environment Detection & Local Development Support
 * - Enhanced Cost Center Pattern Matching
 * - Regional API Support
 * - Configurable fallback facet behavior (entity.name, appName)
 * - Fallback facet support (entity.name, appName) - can be disabled
 * - Enhanced error handling
 * - Configurable exclusions and debugging
 * - Customer-specific pattern matching
 */

const got = require('got');

// ============================================================================
// CONFIGURATION SECTION - CUSTOMIZE FOR YOUR ENVIRONMENT
// ============================================================================

const IS_LOCAL_ENV = typeof $env === "undefined" || $env === null;

// Comment the following lines to enable debug messages
//console.log = function() {}
console.debug = function() {}

/**
 * For local development - uncomment and configure as needed
 */
if (IS_LOCAL_ENV) {
  global._isApiTest = true;
  
  // Mock $secure for local testing
  global.$secure = {
    COST_DISTRIBUTION_USER_API_KEY: "NRAK-YOUR_API_KEY_HERE",
    COST_DISTRIBUTION_INGEST_KEY: "YOUR_INGEST_KEY_HERE"
  };
}

/* -------------------MAIN CONFIGURATION-------------------------------------- */
// API Keys - Use secure credentials in Synthetics
var API_KEY = $secure.COST_DISTRIBUTION_USER_API_KEY;
var INGEST_KEY = $secure.COST_DISTRIBUTION_INGEST_KEY;

// Core Settings
var FACET = 'costcenter'; // Attribute to facet ingest by
var METRIC_NAME = 'ingest.costcenter'; // Name of the metric to create
var TIME_RANGE = '30 minutes'; // Time range for data collection

// Fallback Behavior Configuration
var USE_FALLBACK_FACETS = false; // Set to true to use entity.name and appName fallbacks, false to use only primary facet or 'n/a'

// Regional Configuration
const REGION = "US"; // "US" or "EU"

// Customer-Specific Settings (uncomment and modify as needed)
// Example A (Geographic regions with fallbacks disabled):
// var FACET = 'costcenter';
// var METRIC_NAME = 'ingest.org_a';
// var USE_FALLBACK_FACETS = false; // Strict mode: only use primary facet or 'n/a'
// const REGION = "EU";

// Example B (Custom cost center attribute with fallbacks enabled):
// var FACET = 'Cost Center';
// var METRIC_NAME = 'ingest.org_b';
// var USE_FALLBACK_FACETS = true; // Use entity.name and appName as fallbacks
// const REGION = "US";

// Example C (Standard allocation with strict mode):
// var FACET = 'NewRelicCostAllocation';
// var METRIC_NAME = 'cost_distribution';
// var USE_FALLBACK_FACETS = false; // Recommended for compliance/audit scenarios
// const REGION = "EU";

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
  maxConcurrentRequests: 24,  // Push closer to the 25 limit for maximum speed
  requestsPerSecond: 25,      // Significantly increased for Synthetics time constraint
  burstLimit: 24,             
  accountDelay: 100,          // Drastically reduced delays for speed
  keysetDelay: 50,            
  ingestDelay: 25             
};

// Rate limiting helper - OPTIMIZED FOR MAXIMUM SPEED
let lastRequestTime = 0;
let activeRequests = 0;

async function rateLimitedRequest(requestFn) {
  // Wait if we're at the concurrent request limit
  while (activeRequests >= RATE_LIMIT.maxConcurrentRequests) {
    console.debug(`At concurrent request limit (${activeRequests}/${RATE_LIMIT.maxConcurrentRequests}), waiting...`);
    await new Promise(resolve => setTimeout(resolve, 10)); // Reduced wait time for speed
  }
  
  // Remove per-second throttling for maximum speed in Synthetics
  // Commenting out to achieve maximum throughput
  // const now = Date.now();
  // const timeSinceLastRequest = now - lastRequestTime;
  // const minInterval = 1000 / RATE_LIMIT.requestsPerSecond;
  // if (timeSinceLastRequest < minInterval) {
  //   const waitTime = minInterval - timeSinceLastRequest;
  //   console.debug(`Rate limiting: waiting ${waitTime}ms`);
  //   await new Promise(resolve => setTimeout(resolve, waitTime));
  // }
  
  activeRequests++;
  lastRequestTime = Date.now();
  
  try {
    const result = await requestFn();
    return result;
  } finally {
    activeRequests--;
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

function getIngest(facet, entityName, appName, dataType, acctid, acctname) {
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

    let nrql = `SELECT bytecountestimate() FROM ${dataType}` + metricClause + ` since ${TIME_RANGE} ago` + facetClause + ` LIMIT MAX`;

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
              let isFacetPresent = ingestResult.some(i => Object.keys(i).includes('facet'));
              
              if (!isFacetPresent) {
                // No facet data - single aggregated result
                let metricValue = ingestResult[0].bytecountestimate || 0;
                
                metricsResult[0]['metrics'].push({ 
                  'name': METRIC_NAME, 
                  'type': 'gauge', 
                  'value': metricValue, 
                  'timestamp': now, 
                  'attributes': { 
                    [FACET]: 'n/a', 
                    'account': acctname, 
                    'id': acctid, 
                    'table': dataType 
                  } 
                });
              } else {
                // Process faceted results
                for (let z = 0; z < ingestResult.length; z++) {
                  const costCenter = determineCostCenter(ingestResult[z], facet, entityName, appName);
                  
                  let metricValue = ingestResult[z].bytecountestimate || 0;
                  
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
                  
                  console.log('Cost center: ' + costCenter + ', dataType: ' + dataType + ', metricName: ' + METRIC_NAME + ', account: ' + acctname);
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
  
  for (const ks of keySetResults) {
    if (ks.keySet.length > 0) {
      // Check for the primary facet
      let facetExistsArray = ks.keySet.filter(r => r['key']?.match(regexp));
      let facetString = facetExistsArray.length > 0 ? facetExistsArray[0].key : null;
      
      // Check for alternative facets if enabled
      let entityNameExistsArray = ks.keySet.filter(r => r['key'] === 'entity.name');
      let entityNameString = entityNameExistsArray.length > 0 ? entityNameExistsArray[0].key : null;
      
      let appNameExistsArray = ks.keySet.filter(r => r['key'] === 'appName');
      let appNameString = appNameExistsArray.length > 0 ? appNameExistsArray[0].key : null;
      
      console.debug(`Data type: ${ks.eventType}, Facet: ${facetString}, Entity: ${entityNameString}, App: ${appNameString}`);
      
      // Get the ingest data for the data type in the account
      ingestPromises.push(getIngest(facetString, entityNameString, appNameString, ks.eventType, ks.id, ks.account));
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
