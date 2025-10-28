# Adding Tags, Labels, and Attributes to New Relic Data

**A Companion Guide for the newrelic-cost-distribution Tool**

This document provides a guide on how to add tags, labels, and attributes to various New Relic ingest data types. It is specifically designed to help users of the newrelic-cost-distribution tool implement a robust tagging strategy. The accuracy and usefulness of the cost distribution tool are directly dependent on how well your New Relic data is tagged.

## Recommended Tagging Strategy for Cost Distribution

The newrelic-cost-distribution tool works by using the `bytecountestimate()` function to estimate data volume across all New Relic data types. A Synthetics script then groups these estimates based on attributes and tags to build a custom metric that is inserted back into your account. To get meaningful results, you must apply a consistent set of tags to your resources. We recommend starting with the following tags to associate usage with the appropriate business contexts:

- **`costCenter`**: The specific cost center to which the resource's usage should be billed.
- **`team`**: The development or operations team responsible for the resource.
- **`product`**: The business product or service the resource supports.
- **`environment`**: The deployment environment (e.g., production, staging, development).

> **Key to Success**: Consistency is critical. Choose a naming convention for your tags (e.g., camelCase or snake_case) and use it uniformly across all your New Relic data sources.

## Alternative Strategies When Tagging Isn't Possible

We recognize that implementing a comprehensive, consistent tagging strategy across a large organization can be a significant undertaking. If you are unable to add the recommended tags (`costCenter`, `team`, etc.) immediately, you can still get value from the `newrelic-cost-distribution` tool by configuring it to use other existing attributes.

This approach provides a less granular but still useful view of your New Relic costs and can be an excellent starting point.

### Configuring the Script for Alternative Grouping

The `newrelic-cost-distribution` script is highly configurable, allowing you to specify a list of attributes to group by. This is controlled via settings in the Synthetics script, as detailed in the tool's [CONFIGURATION.md](https://github.com/crshanks/newrelic-cost-distribution/blob/main/CONFIGURATION.md).

**Key Configuration Variables:**

- **`GROUPING_ATTRIBUTES`**: This is an array of attributes the script will look for on your data, in order of preference. The first attribute found in this list will be used for grouping.
- **`DEFAULT_GROUPING_ATTRIBUTE`**: If none of the attributes in `GROUPING_ATTRIBUTES` are found on a particular piece of data, the script will fall back to using this attribute. `appName` is a common default.

**How to Implement:**

You can modify these variables in the Synthetics script configuration to use attributes that are already present in your environment.

**Example Scenario**: Let's say you haven't implemented `costCenter` tags yet, but most of your applications report `appName` and your hosts report `entity.name`. You could configure the script as follows:

1. Set `GROUPING_ATTRIBUTES` to `['appName', 'entity.name', 'hostname']`.
2. Set `DEFAULT_GROUPING_ATTRIBUTE` to `'appName'`.

With this setup, the script will first try to group data by `appName`. If that's not present, it will try `entity.name`, and so on. This allows you to get started with cost allocation using existing data while you work on your tagging strategy.

**Trade-Offs:**

- **Less Unified View**: You will get separate cost breakdowns for different data types (e.g., one breakdown by `appName`, another by `hostname`) rather than a single, unified view across `costCenter` or `team`.
- **Requires More Analysis**: You may need to manually aggregate the results (e.g., mapping which `appName`s belong to which teams) outside of New Relic.

Using default attributes is a pragmatic first step. It allows you to start the cost allocation conversation immediately while you work towards implementing the more robust, standardized tagging strategy outlined in this guide.

## APM (Application Performance Monitoring)

For APM data, the preferred method for adding attributes is through agent configuration. This approach ensures that tags are applied consistently to all transactions without requiring code changes. Custom instrumentation should be reserved as a fallback for capturing dynamic attributes that cannot be defined statically in configuration.

### Adding Attributes with Configuration (Preferred Method)

Most APM agents allow you to enable or include custom attributes directly in the agent configuration file (e.g., `newrelic.yml`, `newrelic.config`, `newrelic.js`). This method is ideal for adding static attributes that you want to be present on all transactions.

📚 **Agent-Specific Configuration Guides:**

- [Java: Java agent attributes documentation](https://docs.newrelic.com/docs/apm/agents/java-agent/attributes/java-agent-attributes/)
- [.NET: .NET agent attributes documentation](https://docs.newrelic.com/docs/apm/agents/net-agent/configuration/net-agent-configuration/)
- [Go: Go agent configuration](https://docs.newrelic.com/docs/apm/agents/go-agent/configuration/go-agent-configuration/)
- [Node.js: Node.js agent configuration](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/)
- [PHP: PHP agent configuration](https://docs.newrelic.com/docs/apm/agents/php-agent/configuration/php-agent-configuration/)
- [Python: Python agent configuration](https://docs.newrelic.com/docs/apm/agents/python-agent/configuration/python-agent-configuration/)
- [Ruby: Ruby agent configuration](https://docs.newrelic.com/docs/apm/agents/ruby-agent/configuration/ruby-agent-configuration/)

#### A Note on OpenTelemetry

If you are using OpenTelemetry to send data to New Relic, the equivalent of static, agent-level attributes are **Resource Attributes**. These attributes are applied to all spans generated by a resource. You can set them using environment variables (e.g., `OTEL_RESOURCE_ATTRIBUTES`) or within your OpenTelemetry Collector or SDK configuration.

To align with the recommended tagging strategy, you would set them like this:

```bash
OTEL_RESOURCE_ATTRIBUTES="costCenter=A-123,team=backend-services"
```

📚 For more details, see the [official OpenTelemetry documentation on Resource Attributes](https://opentelemetry.io/docs/concepts/resources/).

### Adding Attributes with Custom Instrumentation

For dynamic attributes that change within the context of a specific transaction, you can use the New Relic agent APIs. This allows you to capture business-critical information or operational details as they happen.

Here are examples for different language agents:

**Java:**
```java
NewRelic.addCustomParameter("user_id", "12345");
```

**.NET:**
```csharp
NewRelic.Api.Agent.NewRelic.AddCustomParameter("plan_type", "premium");
```

**Node.js:**
```javascript
newrelic.addCustomAttribute('cart_value', 259.99);
```

**Python:**
```python
newrelic.agent.add_custom_attribute('customer_level', 'gold')
```

**Ruby:**
```ruby
::NewRelic::Agent.add_custom_attributes({:product_id => "xyz-123"})
```

**Go:**
```go
txn.AddAttribute("product_line", "electronics")
```

📚 For more details, see the [New Relic documentation on collecting custom attributes](https://docs.newrelic.com/docs/data-apis/custom-data/custom-events/collect-custom-attributes/).

**Cost Impact**: Attributes added to APM transactions are attached to `Transaction` and `TransactionError` events. This allows you to group APM usage data by these attributes, directly attributing the cost of monitoring a specific application or service to a team or cost center.

## Logs

### Forwarding Attributes

When you have logs in context set up with a New Relic APM agent, the agent can automatically forward attributes from your application to your logs. You can also configure your logging library to add custom attributes to your log records.

📚 For more information on adding custom attributes to forwarded logs, see the [custom tags documentation](https://docs.newrelic.com/docs/logs/logs-context/custom-tags-agent-forwarder-logs/).

### Log Parsing

For unstructured logs, you can use New Relic's log parsing capabilities to extract attributes from your log messages. You can define parsing rules using Grok patterns to identify and name important pieces of information in your logs.

📚 For more information, refer to the [documentation on log parsing](https://docs.newrelic.com/docs/logs/log-management/ui-data/parsing/).

**Cost Impact**: Adding attributes like `costCenter` or `team` to your logs allows you to precisely track and allocate the cost of log ingestion and retention for different parts of your application or business.

## Metrics (Prometheus, Telemetry SDK, etc.)

Dimensional metrics can be a major contributor to your overall data ingest, especially when dealing with high-cardinality data from sources like a Prometheus integration. It is crucial to ensure these metrics have the correct attributes (dimensions) so their costs can be allocated correctly.

### Sources of Dimensional Metrics:

- **Prometheus OpenMetrics Integration**: When you forward metrics from your Prometheus servers, the labels on those metrics are converted into attributes in New Relic.
- **New Relic Telemetry SDKs**: When you send custom metrics using the Telemetry SDKs, you can attach any custom attributes you need.
- **APM Agent Metric Timeslices**: While not typically customized with cost tags, it's important to know that APM agents also generate metric data. The cost for these is usually attributed via the `appName` on the APM application.

### How to Add Attributes:

The key to tagging metrics is to ensure the source system includes the necessary labels or attributes before the data is sent to New Relic.

- **For Prometheus**: Add your standard cost allocation labels (`costCenter`, `team`, `product`, etc.) to your scrape configurations or directly to the metrics in your Prometheus instance. These will automatically become queryable attributes in New Relic.
- **For Telemetry SDKs**: When creating a metric, include the recommended tags as attributes in the SDK call.

📚 For more details, see the documentation on the [Prometheus OpenMetrics integration](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/get-started/send-prometheus-metric-data-new-relic/) and the [Metric API](https://docs.newrelic.com/docs/data-apis/ingest-apis/metric-api/introduction-metric-api/).

**Cost Impact**: Without the correct dimensional attributes, all your Prometheus or custom metric data could be lumped into a single "untagged" category by the cost distribution tool. Tagging this data is essential for accurately attributing the significant costs that can come from metric monitoring.

## Infrastructure Monitoring

### Adding Custom Attributes and Labels

You can add custom attributes and labels to your infrastructure agent by editing the `newrelic-infra.yml` configuration file. This is useful for tagging hosts with information like their role, environment, or the team that owns them.

Here is an example of how to add custom attributes in your `newrelic-infra.yml` file:

```yaml
custom_attributes:
  environment: production
  team: backend-services
  costCenter: A-123
```

📚 For more details, see the [documentation on Infrastructure agent configuration](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/configuration/infrastructure-agent-configuration-settings/).

**Cost Impact**: Tagging your hosts allows the cost distribution tool to allocate the expense of the infrastructure agent and associated host monitoring to the correct team or product.

## Kubernetes Monitoring

Data from Kubernetes environments is another potentially large contributor to ingest and is a critical area to tag for cost allocation. The New Relic Kubernetes integration automatically collects a rich set of data from your cluster, and it forwards the labels and annotations from your Kubernetes objects as attributes.

### Adding Attributes via Kubernetes Labels

The most effective way to tag your Kubernetes data is by applying standard Kubernetes labels to your resources (Pods, Deployments, Services, etc.). The New Relic integration will automatically scrape these labels and attach them as attributes to all the telemetry data associated with that object.

Here is an example of adding the recommended cost allocation labels to a Deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
  labels:
    costCenter: "A-123"
    team: "frontend-services"
    product: "WebApp"
    environment: "production"
spec:
  # ... rest of the deployment spec
```

By applying these labels at the source in your Kubernetes manifests, you ensure that all metrics, events, logs, and traces originating from these pods are correctly tagged for cost distribution.

📚 For more details, see the [documentation on configuring Kubernetes integration](https://docs.newrelic.com/install/kubernetes/).

**Cost Impact**: Without proper labeling, all data from your Kubernetes cluster can appear as a single, large block of cost. Applying labels allows you to break down costs by namespace, deployment, team, or any other logical grouping, which is essential for managing the expense of a large-scale microservices environment.

## Cloud Integrations (AWS, Azure, GCP)

### Automatic Tag Collection

When you configure a New Relic cloud integration (for example, with AWS, Azure, or Google Cloud Platform), New Relic automatically imports the tags or labels you've assigned to your cloud resources. This is a powerful way to filter and group your New Relic entities using the same organizational structure you use in your cloud environment.

For virtual machines or hosts running in the cloud, it's highly recommended to also install the New Relic Infrastructure agent. This provides more detailed host-level metrics and ensures that cloud provider tags are consistently associated with the host entity.

📚 Learn more about how New Relic uses cloud provider tags in the [tagging documentation](https://docs.newrelic.com/docs/new-relic-solutions/new-relic-one/core-concepts/use-tags-help-organize-find-your-data/).

**Cost Impact**: Importing cloud provider tags is crucial for attributing the costs of monitored cloud services (like EC2, RDS, Lambda, etc.) to the correct cost centers.

## Browser Monitoring

### Adding Custom Attributes

You can use the browser agent's JavaScript API to add custom attributes to PageView and PageAction events to get more context about your users' interactions with your website.

- **`setAttribute`**: Adds a custom attribute to subsequent PageView events.
  ```javascript
  newrelic.setAttribute('userTier', 'premium');
  newrelic.setAttribute('team', 'frontend-team');
  newrelic.setAttribute('costCenter', 'UI-456');
  ```

- **`addPageAction`**: Records a custom event with associated attributes.
  ```javascript
  newrelic.addPageAction('trialSignup', {
    plan: 'pro-tier',
    team: 'frontend-team',
    costCenter: 'UI-456'
  });
  ```

### Data Type Team Mapping for Browser Data

When implementing the newrelic-cost-distribution tool, Browser monitoring data types are particularly well-suited for assignment to frontend teams. You can configure the script to automatically assign Browser-related data types to your frontend team using the `DATA_TYPE_TEAM_MAPPINGS` configuration.

**Example Configuration:**
```javascript
const DATA_TYPE_TEAM_MAPPINGS = {
  // Example:
  // 'PageView': 'frontend-team',
  // 'PageViewTiming': 'frontend-team',
  // 'PageAction': 'frontend-team',
  // 'BrowserInteraction': 'frontend-team',
  // 'BrowserTiming': 'frontend-team',
  // 'JavaScriptError': 'frontend-team'
};
```

This approach is especially useful when:
- You cannot immediately add custom attributes to all browser events
- You want to ensure all Browser monitoring costs are attributed to the frontend team by default
- You have a clear organizational structure where frontend teams own all browser-related monitoring

📚 Learn more in the [documentation for browser monitoring](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/browser-summary-page/).

**Cost Impact**: While often a smaller portion of total cost, attributing browser monitoring usage can help you understand the monitoring expense associated with different user segments or application features. Using data type team mappings ensures that even untagged Browser data gets properly allocated to your frontend team, preventing it from appearing as "unattributed" cost.

## Custom Events

### Recording Custom Events

You can record custom events using the New Relic agent APIs or the Event API. When creating these events, be sure to include your standard cost allocation attributes.

Here's an example of how to record a custom event with the Node.js agent:

```javascript
newrelic.recordCustomEvent('ProductPurchase', {
  sku: 'NR-TSHIRT-01',
  price: 29.99,
  costCenter: 'B-456'
});
```

📚 For more information, see the [documentation on reporting custom event data](https://docs.newrelic.com/docs/data-apis/custom-data/custom-events/report-custom-event-data/).

**Cost Impact**: If you ingest a high volume of custom events, adding cost-related attributes is essential for accurately billing that usage back to the appropriate teams or products.