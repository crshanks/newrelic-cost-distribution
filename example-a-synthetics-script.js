/**
 * Example A: Geographic Region-based Cost Distribution - Synthetics Version
 * Shows entity name pattern matching for regional cost center assignment
 * This is a template - customize with your actual patterns and values
 */

const got = require('got');

const IS_LOCAL_ENV = typeof $env === "undefined" || $env === null;

// Comment the following lines to log debug messages
//console.log = function() {}
console.debug = function() {}

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

var excludedEventTypes = [
  "AuditLog", "ActivityEvent", "AgentUpdate", "ApplicationAgentContext",
  "CorrelationTriggered", "CorrelationTriggeredV2", "EntityAudits",
  "NrAiAnomaly", "NrAiIncident", "NrAiIssue", "NrAiNotification", "NrAiSignal",
  "NrAiInternalIncident", "NrAiInternalIssue", "NrAuditEvent", "NrComputeUsage",
  "NrConsumption", "NrIntegrationError", "NrMTDConsumption", "NrNotificationsEvent",
  "NrDailyUsage", "NrUsage", "NrdbQuery", "IntegrationDataFreshnessReport",
  "IntegrationProviderReport", "IssueActivated", "IssueCreated", "IssueClosed",
  "IssueMerged", "Public_APICall", "Relationship", "SyntheticsPrivateLocationStatus",
  "SyntheticsPrivateMinion", "SyntheticCheck", "SyntheticRequest",
  "WatcherDeviation", "WatcherSignalDeviation", "WorkloadStatus"
];

// Example geographic region-based cost center patterns
// Replace with your organization's actual patterns
const costCenterPatterns = [
  { pattern: '.*-region1-.*', value: 'region_a'},
  { pattern: '.*-region2-.*', value: 'region_b'},
  { pattern: 'REGION1 .*', value: 'region_a'},
  { pattern: 'REGION2 .*', value: 'region_b'}
];

const region = "EU";
let gqlApiEndpoint = "https://api.eu.newrelic.com/graphql";
let metricApiEndpoint = "https://metric-api.eu.newrelic.com/metric/v1";

const GRAPH_API = gqlApiEndpoint;
const METRIC_API = metricApiEndpoint;
const HEADERS = { 'Content-Type': 'application/json', 'Api-Key': API_KEY };

const sleep = (milliseconds) => {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
};

function applyCostCenterPatterns(facetValue) {
  if (!facetValue) return facetValue;
  
  for (const p of costCenterPatterns) {
    if (facetValue.match(p.pattern)) {
      return p.value;
    }
  }
  return facetValue;
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
    json: { 'query': q, 'variables': {} }
  };

  let resp = await got.post(opts).json();
  return resp.data.actor.accounts;
}

async function getKeySet(eventType, acct) {
  let nrql = `SELECT keyset() FROM ${eventType} since 1 day ago`;
  let q = `{
    actor {
      account(id: ${acct.id}) {
        nrql(query: "${nrql}", timeout: 90) {
          results
        }
      }
    }
  }`;

  let opts = {
    url: GRAPH_API,
    headers: HEADERS,
    json: { 'query': q, 'variables': {} }
  };
  
  let keySet = [];
  let anEventType = null;

  let resp = await got.post(opts).json();
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
    console.log('undefined response-keyset');
    anEventType = { 'account': acct.name, 'id': acct.id, 'eventType': eventType, 'keySet': keySet };
    return anEventType;
  }
}

function getIngest(facet, entityName, appName, dataType, acctid, acctname) {
  return new Promise((resolve, reject) => {
    let metricClause = dataType === 'Metric' ? ` where metricName != '${METRIC_NAME}'` : '';
    
    let facetClause;
    if (facet != null) {
      facetClause = ` facet \`${facet}\``;
    } else if (entityName != null) {
      facetClause = ` facet entity.name`;
    } else if (appName != null) {
      facetClause = ` facet appName`;
    } else {
      facetClause = '';
    }

    let nrql = `SELECT bytecountestimate() FROM ${dataType}` + metricClause + ` since ${TIME_RANGE} ago` + facetClause + ` LIMIT MAX`;

    let q = `{
      actor {
        account(id: ${acctid}) {
          nrql(query: "${nrql}", timeout: 60) {
            results
          }
        }
      }
    }`;

    let opts = {
      url: GRAPH_API,
      headers: HEADERS,
      json: { 'query': q, 'variables': {} }
    };
    
    let ingestResult = [];
    let metricsResult = [{ 'metrics': [] }];
    let now = new Date().valueOf();

    got.post(opts).then(resp => {
      let jsonResp = JSON.parse(resp.body);
      if (resp !== undefined) {
        if (resp.statusCode == 200) {
          if (!jsonResp.errors) {
            if (jsonResp.data.actor.account.nrql.results.length > 0) {
              ingestResult = jsonResp.data.actor.account.nrql.results;
              let isFacetPresent = ingestResult.some(i => Object.keys(i).includes('facet'));
              
              if (!isFacetPresent) {
                metricsResult[0]['metrics'].push({ 
                  'name': METRIC_NAME, 'type': 'gauge', 'value': ingestResult[0].result, 'timestamp': now, 
                  'attributes': { [FACET]: 'n/a', 'account': acctname, 'id': acctid, 'table': dataType } 
                });
              } else {
                for (let z = 0; z < ingestResult.length; z++) {
                  let costCenter = 'n/a';
                  
                  if (ingestResult[z].facet != null) {
                    costCenter = applyCostCenterPatterns(ingestResult[z].facet);
                  }
                  
                  metricsResult[0]['metrics'].push({ 
                    'name': METRIC_NAME, 'type': 'gauge', 'value': ingestResult[z].result, 'timestamp': now, 
                    'attributes': { [FACET]: costCenter, 'account': acctname, 'id': acctid, 'table': dataType } 
                  });
                  
                  console.log('Cost center assignment: ' + costCenter + ', dataType: ' + dataType + ', metricName: ' + METRIC_NAME + ', account: '+ acctname);
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
          console.log(resp.statusCode);
          resolve(metricsResult);
        }
      } else {
        console.log('undefined response-ingest');
        resolve(metricsResult);
      }
    });
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
    json: payload
  };
  
  let resp = await got.post(options);
  if (resp.statusCode == 202) {
    return 'complete';
  } else {
    console.log('Error posting to NRDB ' + resp.statusCode);
    console.log(resp.body);
    return 'failed';
  }
}

async function main() {
  let accounts = await getAccounts();

  if (accounts !== null && accounts.length > 0) {
    for (let acct of accounts) {
      console.log('Account: ' + acct.name);
      let keySetProms = [];
      
      if (acct.reportingEventTypes !== null && acct.reportingEventTypes.length > 0) {
        let eventTypes = acct.reportingEventTypes;
        for (var k = 0; k < eventTypes.length; k++) {
          let eventString = eventTypes[k];
          if (!excludedEventTypes.includes(eventString)) {
            if (eventString.includes(":") || eventString.indexOf(' ') >= 0) {
              eventString = "`" + eventString + "`";
            }
            keySetProms.push(getKeySet(eventString, acct));
          }
        }
      }

      const escapedFacet = FACET.replace(/\s/g, '\\s');
      const pattern = `^${escapedFacet}$|^tags.${escapedFacet}$|^label.${escapedFacet}$`;
      const regexp = new RegExp(pattern, 'i');

      console.log('Retrieving keysets for account: ' + acct.name);
      Promise.all(keySetProms).then(keySets => {
        let ingestProms = [];
        for (let ks of keySets) {
          let facetExistsArray = ks.keySet.filter(r => r['key'].match(regexp));
          let facetString = facetExistsArray.length > 0 ? facetExistsArray[0].key : null;
          
          let entityNameExistsArray = ks.keySet.filter(r => r['key'] === 'entity.name');
          let entityNameString = entityNameExistsArray.length > 0 ? entityNameExistsArray[0].key : null;
          
          let appNameExistsArray = ks.keySet.filter(r => r['key'] === 'appName');
          let appNameString = appNameExistsArray.length > 0 ? appNameExistsArray[0].key : null;
          
          console.log('Data type: ' + ks.eventType + ', Facet attribute: ' + facetString);
          
          ingestProms.push(getIngest(facetString, entityNameString, appNameString, ks.eventType, ks.id, ks.account));
        }
        return ingestProms;
      }).then(ips => {
        console.log('Completed retrieving ingest data for account: ' + acct.name);
        Promise.all(ips).then(ingests => {
          console.log('Writing ingest data to NRDB for account: ' + acct.name);
          for (var ing of ingests) {
            if (ing.length > 0) {
              writeAsMetrics(ing);
            }
          }
          console.log('Completed writing ingest data to NRDB for account: ' + acct.name);
        });
      });
      sleep(1000);
    }
  }
  console.log('done');
}

main();
