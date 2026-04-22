# Automation Schema Reference

This document describes the structure of Tellescope automations, including Journeys, AutomationSteps, and AutomationTriggers.

## Table of Contents
- [Journey Structure](#journey-structure)
- [AutomationStep Structure](#automationstep-structure)
- [AutomationTrigger Structure](#automationtrigger-structure)
- [Event Types](#event-types)
- [Action Types](#action-types)
- [Complete Examples](#complete-examples)

---

## Journey Structure

Journeys are patient workflow containers with states and automation steps.

```typescript
interface Journey {
  // Required
  id: string                              // MongoDB ObjectId (24-char hex)
  title: string                           // Journey name (max 100 chars)
  defaultState: string                    // Initial state name
  states: JourneyState[]                  // Array of states

  // Optional
  description?: string                    // Journey description
  tags?: string[]                         // Searchable tags
  onIncomingEnduserCommunication?: 'Remove' | ''  // Auto-remove on patient message
  archivedAt?: Date | ''                  // Soft delete timestamp
}

interface JourneyState {
  name: string                            // State identifier
  priority: 'High' | 'Medium' | 'Low' | 'N/A'  // Display priority
  requiresFollowup?: boolean              // Flag for care team
  description?: string                    // State description
}
```

### Journey Example
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Patient Onboarding",
  "defaultState": "enrolled",
  "description": "Initial onboarding workflow for new patients",
  "states": [
    {
      "name": "enrolled",
      "priority": "High",
      "requiresFollowup": false,
      "description": "Patient enrolled in program"
    },
    {
      "name": "intake_complete",
      "priority": "Medium",
      "requiresFollowup": false,
      "description": "Intake form completed"
    },
    {
      "name": "active",
      "priority": "Low",
      "requiresFollowup": false,
      "description": "Patient fully onboarded"
    }
  ],
  "tags": ["onboarding", "new-patient"]
}
```

---

## AutomationStep Structure

Steps are individual actions within a journey, triggered by events.

```typescript
interface AutomationStep {
  // Required
  id: string                              // MongoDB ObjectId
  journeyId: string                       // Parent journey reference
  events: AutomationEvent[]               // Trigger events
  action: AutomationAction                // Action to execute

  // Optional
  conditions?: AutomationCondition[]      // State-based conditions
  enduserConditions?: object              // Patient filter conditions (see Query Syntax below)
  continueOnError?: boolean               // Continue journey on failure (can also be in action.info)
  tags?: string[]                         // Step tags
  flowchartUI?: FlowchartUI               // UI positioning data (see below)
}

interface FlowchartUI {
  x: number                               // Horizontal position (can be negative)
  y: number                               // Vertical position (can be negative)
}

interface AutomationCondition {
  type: 'state'
  info: {
    state: string                         // Required state name
  }
}
```

### Enduser Conditions (Patient Filters)

The `enduserConditions` field uses MongoDB-style query syntax to filter which patients trigger the step.

```typescript
interface EnduserConditions {
  $and?: ConditionGroup[]                 // All conditions must match
  $or?: ConditionGroup[]                  // Any condition must match
}

interface ConditionGroup {
  condition: {
    [fieldName: string]: ComparisonOperator
  }
}

// Comparison operators
interface ComparisonOperator {
  $gt?: string | number                   // Greater than
  $gte?: string | number                  // Greater than or equal
  $lt?: string | number                   // Less than
  $lte?: string | number                  // Less than or equal
  $eq?: string | number                   // Equals
}
```

#### Examples

**Age greater than 50:**
```json
{
  "enduserConditions": {
    "$and": [
      { "condition": { "Age": { "$gt": "50" } } }
    ]
  }
}
```

**Age between 25 and 50:**
```json
{
  "enduserConditions": {
    "$and": [
      { "condition": { "Age": { "$gt": "24" } } },
      { "condition": { "Age": { "$lt": "51" } } }
    ]
  }
}
```

**Custom field equals value:**
```json
{
  "enduserConditions": {
    "$and": [
      { "condition": { "riskLevel": { "$eq": "high" } } }
    ]
  }
}
```

---

## AutomationTrigger Structure

Standalone triggers that fire based on system events, independent of journeys.

```typescript
interface AutomationTrigger {
  // Required
  id: string
  title: string                           // Trigger name
  event: AutomationTriggerEvent           // Event configuration
  action: AutomationTriggerAction         // Action to take
  status: 'Active' | 'Inactive'           // Enable/disable

  // Optional
  journeyId?: string                      // Link to journey
  enduserCondition?: object               // Patient filter
  oncePerEnduser?: boolean                // Fire only once per patient
  tags?: string[]
  availabilityTimezone?: string           // Timezone for time conditions
  weeklyAvailabilities?: WeeklyAvailability[]  // Time-based restrictions
  archivedAt?: Date | ''
}
```

---

## Event Types

### Journey Step Events

#### onJourneyStart
Fires when a patient enters the journey.
```json
{
  "type": "onJourneyStart",
  "info": {}
}
```

#### afterAction
Fires after a delay from a previous step.
```json
{
  "type": "afterAction",
  "info": {
    "automationStepId": "507f...",        // Previous step ID
    "delayInMS": 86400000,                // Delay in milliseconds (takes precedence)
    "delay": 1,                           // Human-readable delay value
    "unit": "Days",                       // Days | Hours | Minutes | Seconds
    "officeHoursOnly": true,              // Only during business hours
    "useEnduserTimezone": true,           // Use patient timezone
    "cancelConditions": [                 // Cancel if these occur
      {
        "type": "formResponse",
        "info": { "automationStepId": "507f..." }
      }
    ]
  }
}
```

#### formResponse
Fires when a specific form is submitted.
```json
{
  "type": "formResponse",
  "info": {
    "automationStepId": "507f..."         // Step that sent the form
  }
}
```

#### formUnsubmitted
Fires when a form is NOT submitted within a time window.
```json
{
  "type": "formUnsubmitted",
  "info": {
    "automationStepId": "507f...",
    "delayInMS": 172800000                // Time to wait before firing
  }
}
```

#### ticketCompleted
Fires when a ticket is completed.
```json
{
  "type": "ticketCompleted",
  "info": {
    "automationStepId": "507f...",        // Step that created the ticket
    "closedForReason": "1"                // Optional: filter by close reason
  }
}
```

**Note:** Use `closedForReason` to trigger different actions based on how the ticket was closed. The value corresponds to the close reason defined in the ticket's `closeReasons` array.

#### waitForTrigger
Waits for an automation trigger to fire.
```json
{
  "type": "waitForTrigger",
  "info": {
    "automationTriggerId": "507f...",
    "timeout": 604800000                  // Optional timeout in ms
  }
}
```

#### onCallOutcome
Fires when a call is completed with a specific outcome.
```json
{
  "type": "onCallOutcome",
  "info": {
    "automationStepId": "507f...",
    "outcome": "Answered"                 // Call outcome value
  }
}
```

### Automation Trigger Events

#### Form Submitted
```json
{
  "type": "Form Submitted",
  "info": {
    "formId": "507f...",
    "otherFormIds": ["507f..."],          // Alternative forms
    "submitterType": "enduser"            // enduser | user | Anyone
  }
}
```

#### Vital Count
Fires based on vital measurement patterns.
```json
{
  "type": "Vital Count",
  "info": {
    "units": ["mmHg", "bpm"],
    "minutes": 5,
    "comparison": "greaterThan",          // greaterThan | lessThan | equals
    "periodInMS": 604800000               // Time period to check
  }
}
```

#### Appointment Completed
```json
{
  "type": "Appointment Completed",
  "info": {
    "titles": ["Follow-up"],              // Appointment titles
    "templateIds": ["507f..."]            // Calendar event template IDs
  }
}
```

#### No Recent Appointment
Fires if patient has no appointment in time window.
```json
{
  "type": "No Recent Appointment",
  "info": {
    "intervalInMS": 2592000000,           // 30 days
    "templateIds": ["507f..."],
    "titles": ["Annual Physical"]
  }
}
```

#### Has Not Engaged
Fires if patient has not interacted.
```json
{
  "type": "Has Not Engaged",
  "info": {
    "intervalInMS": 1209600000            // 14 days
  }
}
```

#### Fields Changed
Fires when specific patient fields change.
```json
{
  "type": "Fields Changed",
  "info": {
    "fields": ["status", "riskLevel"]
  }
}
```

#### Tag Added
Fires when a tag is added to patient.
```json
{
  "type": "Tag Added",
  "info": {
    "tag": "high-priority"
  }
}
```

#### Order Status Equals
Fires when a patient's order status matches a specific source and status.
```json
{
  "type": "Order Status Equals",
  "info": {
    "source": "OpenLoop",                   // Order source (e.g., "OpenLoop")
    "status": "Shipped",                    // Status value to match
    "fills": [],                            // Optional: fill value filters
    "skus": [],                             // Optional: SKU filters
    "skuPartials": [],                      // Optional: partial SKU matches
    "titlePartials": []                     // Optional: partial title matches
  }
}
```

#### Enduser Created
Fires when a new patient is created.
```json
{
  "type": "Enduser Created",
  "info": {}
}
```

---

## Action Types

### Important: Action Type Naming Conventions

**Journey step actions** use camelCase (e.g., `sendSMS`, `sendEmail`, `addToJourney`).

**Automation trigger actions** use title case with spaces (e.g., `Add To Journey`, `Add Tags`, `Set Fields`). See the [Trigger Action Types](#trigger-action-types) section below.

### Important: senderId is Required

The `senderId` field is **required** for `sendSMS` and `sendEmail` actions. It cannot be omitted or set to an empty string — both cause API errors. When generating configurations without a known user ID, use a placeholder ObjectId (e.g., `"507f1f77bcf86cd799439012"`). The sender will appear blank after import and should be set manually.

### Communication Actions

#### sendEmail
```json
{
  "type": "sendEmail",
  "info": {
    "templateId": "507f...",              // Required: message template ID
    "senderId": "507f...",                // Required: sending user ID
    "fromEmailOverride": "custom@org.com",// Optional: custom from address
    "ccRelatedContactTypes": ["insurance"]// Optional: CC related contacts
  }
}
```

#### sendSMS
```json
{
  "type": "sendSMS",
  "info": {
    "templateId": "507f...",
    "senderId": "507f...",
    "phoneNumberOverride": "+1234567890"  // Optional: override phone
  }
}
```

#### sendForm
```json
{
  "type": "sendForm",
  "info": {
    "formId": "507f...",                  // Required: form ID
    "senderId": "507f...",
    "channel": "Email"                    // Email | SMS | Chat
  }
}
```

#### sendChat
```json
{
  "type": "sendChat",
  "info": {
    "templateId": "507f...",
    "identifier": "chat_channel_name",
    "includeCareTeam": true,
    "userIds": ["507f..."]
  }
}
```

### Patient Management Actions

#### addToJourney
```json
{
  "type": "addToJourney",
  "info": {
    "journeyId": "507f..."
  }
}
```

#### removeFromJourney
```json
{
  "type": "removeFromJourney",
  "info": {
    "journeyId": "507f..."
  }
}
```

#### setEnduserFields
```json
{
  "type": "setEnduserFields",
  "info": {
    "fields": [
      {
        "name": "customField1",
        "type": "Custom Value",           // Custom Value | Current Date | Current Timestamp
        "value": "some-value"
      }
    ]
  }
}
```

#### addEnduserTags
```json
{
  "type": "addEnduserTags",
  "info": {
    "tags": ["follow-up-required", "high-risk"],
    "replaceExisting": false
  }
}
```

#### removeEnduserTags
```json
{
  "type": "removeEnduserTags",
  "info": {
    "tags": ["pending-intake"]
  }
}
```

#### setEnduserStatus
```json
{
  "type": "setEnduserStatus",
  "info": {
    "status": "active"                    // Status value
  }
}
```

#### assignCareTeamByTeamTag
```json
{
  "type": "assignCareTeamByTeamTag",
  "info": {
    "tags": ["primary-care"],
    "limitToOneUser": true,
    "setAsPrimary": true
  }
}
```

### Care Management Actions

#### createTicket
```json
{
  "type": "createTicket",
  "info": {
    "title": "Follow-up required",
    "priority": "High",
    "assignmentStrategy": {               // Optional: how to assign the ticket
      "type": "care-team-random",         // care-team-random | round-robin | specific-user
      "info": {}
    },
    "defaultAssignee": "507f...",         // Optional: fallback assignee user ID
    "closeReasons": ["Resolved", "No response", "Referred"],  // Optional: close reason options
    "closeOnFinishedActions": true,       // Optional: auto-close when actions complete
    "reminders": []                       // Optional: reminder configuration
  }
}
```

#### createCarePlan
```json
{
  "type": "createCarePlan",
  "info": {
    "title": "Diabetes Management Plan",
    "htmlDescription": "<p>Care plan content</p>",
    "highlightedEnduserFields": ["bloodGlucose"],
    "closeAutomaticallyByTicket": true
  }
}
```

#### completeCarePlan
```json
{
  "type": "completeCarePlan",
  "info": {}
}
```

#### createUserNotifications
```json
{
  "type": "createUserNotifications",
  "info": {
    "message": "Patient needs attention",
    "notificationType": "urgent",
    "careTeamOnly": true,
    "maxUsers": 5
  }
}
```

### Integration Actions

#### sendWebhook
```json
{
  "type": "sendWebhook",
  "info": {
    "message": "Patient action completed",
    "url": "https://example.com/webhook",
    "secret": "webhook-secret",
    "method": "post",
    "fields": [
      { "label": "patientId", "value": "${enduserId}" }
    ],
    "headers": [
      { "label": "Authorization", "value": "Bearer token" }
    ]
  }
}
```

#### zendeskCreateTicket
```json
{
  "type": "zendeskCreateTicket",
  "info": {
    "templateId": "507f...",
    "defaultSenderId": "507f...",
    "isInternalNote": false
  }
}
```

#### iterableSendEmail
```json
{
  "type": "iterableSendEmail",
  "info": {
    "campaignId": "12345"
  }
}
```

### AI Actions

#### aiDecision
```json
{
  "type": "aiDecision",
  "info": {
    "prompt": "Should we escalate this case?",
    "outcomes": ["yes", "no"]
  }
}
```

### Complete Action Type List

| Action Type | Description |
|------------|-------------|
| `sendEmail` | Send email template |
| `sendSMS` | Send SMS template |
| `sendForm` | Send form to patient |
| `sendChat` | Send chat message |
| `addToJourney` | Add patient to journey |
| `removeFromJourney` | Remove patient from journey |
| `setEnduserFields` | Update patient fields |
| `addEnduserTags` | Add tags to patient |
| `removeEnduserTags` | Remove tags from patient |
| `setEnduserStatus` | Set patient status |
| `assignCareTeamByTeamTag` | Assign care team |
| `createTicket` | Create support ticket |
| `createCarePlan` | Create care plan |
| `completeCarePlan` | Complete care plan |
| `createUserNotifications` | Notify users |
| `sendWebhook` | Call external webhook |
| `zendeskCreateTicket` | Create Zendesk ticket |
| `iterableSendEmail` | Send via Iterable |
| `iterableSMS` | Send SMS via Iterable |
| `activeCampaignSync` | Sync to ActiveCampaign |
| `customerIOSync` | Sync to Customer.io |
| `aiDecision` | AI-based routing |
| `canvasSync` | Sync to Canvas EHR |
| `athenaSync` | Sync to Athena EHR |
| `metriportSync` | Sync to Metriport |
| `healthieSync` | Sync to Healthie |
| `zusSync` | Sync to Zus |
| `chargebeeSync` | Sync to Chargebee |
| `stripeSync` | Sync to Stripe |
| `elationSync` | Sync to Elation |
| `updateRelatedContacts` | Update related contacts |
| `completeRelatedContacts` | Complete related contacts |
| `setJourneyState` | Change journey state |
| `playRecording` | Play audio recording |
| `makePhoneCall` | Initiate phone call |
| `scheduleAppointment` | Auto-schedule appointment |
| `createAppointment` | Create appointment directly |
| `createOrder` | Create lab order |

### Trigger Action Types

Automation trigger actions use **title case with spaces**, unlike journey step actions which use camelCase.

| Action Type | Description |
|------------|-------------|
| `Add To Journey` | Add patient to journey |
| `Remove From Journey` | Remove patient from journey |
| `Remove From All Journeys` | Remove from all journeys |
| `Add Tags` | Add tags to patient |
| `Remove Tags` | Remove tags from patient |
| `Set Fields` | Update patient fields |
| `Assign Care Team` | Assign care team by tag |
| `Remove Care Team` | Remove care team |
| `Create User Notifications` | Notify users |
| `Reply to Chat` | Send chat reply |

---

## Complete Examples

### Simple Welcome Journey
```json
{
  "exportedAt": "2025-01-19T12:00:00.000Z",
  "organizationId": "507f1f77bcf86cd799439011",
  "organizationName": "Example Clinic",
  "version": "1.0",
  "data": {
    "journeys": [
      {
        "id": "60d5ec49c1234567890abcd1",
        "title": "Welcome Journey",
        "defaultState": "enrolled",
        "description": "Simple welcome workflow for new patients",
        "states": [
          {
            "name": "enrolled",
            "priority": "High",
            "requiresFollowup": false
          },
          {
            "name": "welcomed",
            "priority": "Low",
            "requiresFollowup": false
          }
        ],
        "tags": ["welcome", "onboarding"],
        "steps": [
          {
            "id": "60d5ec49c1234567890abcd2",
            "journeyId": "60d5ec49c1234567890abcd1",
            "events": [
              { "type": "onJourneyStart", "info": {} }
            ],
            "action": {
              "type": "sendEmail",
              "info": {
                "templateId": "60d5ec49c1234567890abcd3",
                "senderId": "507f1f77bcf86cd799439012"
              }
            },
            "continueOnError": false
          },
          {
            "id": "60d5ec49c1234567890abcd4",
            "journeyId": "60d5ec49c1234567890abcd1",
            "events": [
              {
                "type": "afterAction",
                "info": {
                  "automationStepId": "60d5ec49c1234567890abcd2",
                  "delayInMS": 86400000,
                  "delay": 1,
                  "unit": "Days"
                }
              }
            ],
            "action": {
              "type": "setJourneyState",
              "info": {
                "state": "welcomed"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### Standalone Trigger Example
```json
{
  "data": {
    "automation_triggers": [
      {
        "id": "60d5ec49c1234567890abcd5",
        "title": "High Risk Alert",
        "event": {
          "type": "Tag Added",
          "info": {
            "tag": "high-risk"
          }
        },
        "action": {
          "type": "Create User Notifications",
          "info": {
            "message": "High-risk patient requires attention",
            "notificationType": "urgent",
            "careTeamOnly": true
          }
        },
        "status": "active",
        "oncePerEnduser": false,
        "tags": ["alerts", "high-risk"]
      }
    ]
  }
}
```

### Journey with Age-Based Branching

This example shows how to use `enduserConditions` to branch patients into different paths based on their age.

```json
{
  "data": {
    "journeys": [
      {
        "id": "60d5ec49c1234567890abcd6",
        "title": "Age-Based Routing",
        "defaultState": "New",
        "states": [
          { "name": "New", "priority": "N/A" }
        ],
        "steps": [
          {
            "id": "60d5ec49c1234567890abcd7",
            "journeyId": "60d5ec49c1234567890abcd6",
            "events": [{ "type": "onJourneyStart", "info": {} }],
            "action": {
              "type": "setEnduserStatus",
              "info": { "status": "Processing" }
            },
            "conditions": []
          },
          {
            "id": "60d5ec49c1234567890abcd8",
            "journeyId": "60d5ec49c1234567890abcd6",
            "events": [{
              "type": "afterAction",
              "info": {
                "automationStepId": "60d5ec49c1234567890abcd7",
                "delayInMS": 0,
                "delay": 0,
                "unit": "Seconds"
              }
            }],
            "action": {
              "type": "addEnduserTags",
              "info": { "tags": ["Senior"] }
            },
            "enduserConditions": {
              "$and": [{ "condition": { "Age": { "$gt": "65" } } }]
            },
            "flowchartUI": { "x": 200, "y": 150 }
          },
          {
            "id": "60d5ec49c1234567890abcd9",
            "journeyId": "60d5ec49c1234567890abcd6",
            "events": [{
              "type": "afterAction",
              "info": {
                "automationStepId": "60d5ec49c1234567890abcd7",
                "delayInMS": 0,
                "delay": 0,
                "unit": "Seconds"
              }
            }],
            "action": {
              "type": "addEnduserTags",
              "info": { "tags": ["Adult"] }
            },
            "enduserConditions": {
              "$and": [
                { "condition": { "Age": { "$gt": "17" } } },
                { "condition": { "Age": { "$lte": "65" } } }
              ]
            },
            "flowchartUI": { "x": 0, "y": 150 }
          },
          {
            "id": "60d5ec49c123456789abcda",
            "journeyId": "60d5ec49c1234567890abcd6",
            "events": [{
              "type": "afterAction",
              "info": {
                "automationStepId": "60d5ec49c1234567890abcd7",
                "delayInMS": 0,
                "delay": 0,
                "unit": "Seconds"
              }
            }],
            "action": {
              "type": "addEnduserTags",
              "info": { "tags": ["Minor"] }
            },
            "enduserConditions": {
              "$and": [{ "condition": { "Age": { "$lte": "17" } } }]
            },
            "flowchartUI": { "x": -200, "y": 150 }
          }
        ]
      }
    ]
  }
}
```

**Key points:**
- Multiple steps can fire from the same `afterAction` event with different `enduserConditions`
- Only the step(s) whose conditions match the patient will execute
- Use `flowchartUI` to position steps visually in the journey builder
- `delayInMS: 0` with `unit: "Seconds"` means immediate execution after the previous step
