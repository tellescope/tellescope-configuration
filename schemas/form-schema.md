# Form Schema Reference

This document describes the structure of Tellescope forms, including Forms, FormFields, and their configuration options.

## Table of Contents
- [Form Structure](#form-structure)
- [FormField Structure](#formfield-structure)
- [Field Types](#field-types)
- [Field Options](#field-options)
- [Conditional Logic](#conditional-logic)
- [Form Customization](#form-customization)
- [Complete Examples](#complete-examples)

---

## Form Structure

Forms are containers for fields that collect patient or internal data.

```typescript
interface Form {
  // Required
  id: string                              // MongoDB ObjectId (24-char hex)
  title: string                           // Form name (max 250 chars)
  numFields: number                       // Count of fields

  // Display
  displayTitle?: string                   // Patient-facing title (if different)
  description?: string                    // Form description
  type?: 'note' | 'enduserFacing'         // Internal note or patient form

  // Intake Configuration (for patient-facing forms)
  intakeEmailRequired?: boolean
  intakeEmailHidden?: boolean
  intakePhone?: 'required' | 'optional' | 'hidden'
  intakeDateOfBirth?: 'required' | 'optional' | 'hidden'
  intakeState?: 'required' | 'optional' | 'hidden'
  intakeGender?: 'required' | 'optional' | 'hidden'
  intakeGenderIsSex?: boolean             // Label as "Sex" instead of "Gender"

  // Communication Customization
  customSubject?: string                  // Email subject when sending form
  customGreeting?: string                 // Opening message
  customSignature?: string                // Closing signature
  thanksMessage?: string                  // Text after submission
  htmlThanksMessage?: string              // HTML version

  // Public Form Settings
  allowPublicURL?: boolean                // Enable public link
  submitRedirectURL?: string              // Redirect after submission
  backgroundColor?: string                // Background color hex
  publicShowLanguage?: boolean            // Show language selector
  publicShowDownload?: boolean            // Allow PDF download

  // Behavior
  disabled?: boolean                      // Disable form
  lockResponsesOnSubmission?: boolean     // Prevent edits after submit
  hideFromCompose?: boolean               // Hide from message composer
  allowPortalSubmission?: boolean         // Allow patient portal submission

  // Customization
  customization?: FormCustomization       // Visual customization (see below)
  tags?: string[]                         // Searchable tags

  // EHR Integrations
  syncToCanvas?: boolean
  canvasId?: string
  isNonVisitElationNote?: boolean
  elationVisitNoteType?: string

  // Scoring (for assessment forms)
  scoring?: FormScoring[]                 // Score calculation rules
  version?: string                        // Form version (e.g., "v2")
  ipAddressCustomField?: string           // Custom field to store IP address
}
```

### Form Scoring

For assessment forms (like PHQ-9, GAD-7), the `scoring` array defines how responses are converted to numeric scores.

```typescript
interface FormScoring {
  title: string                           // Score category name (e.g., "PHQ-9 Score")
  fieldId: string                         // Field being scored (MongoDB ObjectId)
  response: string                        // Response text that triggers this score
  score: number                           // Point value for this response
}
```

#### Scoring Example (PHQ-9)
```json
{
  "scoring": [
    { "title": "PHQ-9 Score", "fieldId": "507f...", "response": "Not at all", "score": 0 },
    { "title": "PHQ-9 Score", "fieldId": "507f...", "response": "Several days", "score": 1 },
    { "title": "PHQ-9 Score", "fieldId": "507f...", "response": "More than half the days", "score": 2 },
    { "title": "PHQ-9 Score", "fieldId": "507f...", "response": "Nearly every day", "score": 3 }
  ]
}
```

**Pattern:** Create one scoring entry per field per response option. The total score is calculated by summing all matching scores based on the patient's responses.

---

## FormField Structure

Fields are individual questions or inputs within a form.

```typescript
interface FormField {
  // Required
  id: string                              // MongoDB ObjectId
  formId: string                          // Parent form reference
  title: string                           // Question/label text
  type: FormFieldType                     // Field type (see below)
  previousFields: PreviousFormField[]     // Ordering and conditions

  // Display
  placeholder?: string                    // Input placeholder text
  description?: string                    // Help text below field
  htmlDescription?: string                // Rich help text
  headerText?: string                     // Section header above field
  titleFontSize?: number                  // Title font size

  // Validation
  isOptional?: boolean                    // Field is optional (default: required)
  options?: FormFieldOptions              // Field-specific options (see below)

  // Question Group membership
  isInGroup?: boolean                     // true if this field is a sub-field of a Question Group

  // Behavior
  sharedWithEnduser?: boolean             // Visible in patient portal
  prepopulateFromFields?: boolean         // Auto-fill from patient data
  disabledWhenPrepopulated?: boolean      // Lock if prepopulated
  highlightOnTimeline?: boolean           // Highlight response on timeline

  // Conditional Display
  calloutConditions?: FormFieldCalloutCondition[]  // Show callouts
  feedback?: FormFieldFeedback[]          // Show feedback based on response

  // Integration
  intakeField?: string                    // Maps to intake field
  externalId?: string                     // External system reference
}
```

---

## Field Types

### Basic Input Types

| Type | Description | Common Options |
|------|-------------|----------------|
| `string` | Single-line text | `maxLength`, `default` |
| `stringLong` | Multi-line text | `maxLength` |
| `number` | Numeric input | `min`, `max` |
| `email` | Email address | - |
| `phone` | Phone number | - |
| `date` | Date & Time picker | `min`, `max`, `useDatePicker` |
| `dateString` | Date only (no time) | - |
| `Time` | Time picker | - |
| `Timezone` | Timezone selector | - |
| `rating` | Numeric rating | `min`, `max` |

### Choice Types

| Type | Description | Common Options |
|------|-------------|----------------|
| `multiple_choice` | Radio or checkbox | `choices`, `radio`, `other` |
| `Dropdown` | Dropdown select | `choices` |
| `ranking` | Drag-to-rank | `choices` |

### File Types

| Type | Description | Common Options |
|------|-------------|----------------|
| `file` | Single file upload | `validFileTypes`, `maxFileSize` |
| `files` | Multiple file upload | `validFileTypes`, `maxFileSize` |
| `signature` | Signature capture | `prefillSignature` |

### Specialized Types

| Type | Description | Common Options |
|------|-------------|----------------|
| `Address` | Full address | `addressFields`, `validStates` |
| `Height` | Height input | - |
| `Conditions` | Medical conditions | `dataSource` |
| `Allergies` | Allergy list | `dataSource` |
| `Medications` | Medication list | `dataSource` |
| `Insurance` | Insurance info | `requirePredefinedInsurer` |
| `Related Contacts` | Contact relationships | - |

### Integration Types

| Type | Description | Common Options |
|------|-------------|----------------|
| `Appointment Booking` | Self-scheduling | `bookingPageId` |
| `Database Select` | Select from database | `databaseId`, `databaseLabel` |
| `Stripe` | Payment collection | `productIds`, `chargeImmediately` |
| `Chargebee` | Chargebee payment | `productIds` |
| `Bridge Eligibility` | Insurance check | `bridgeServiceTypeIds` |
| `Pharmacy Search` | Pharmacy lookup | - |

### Display Types

| Type | Description |
|------|-------------|
| `Rich Text` | Display rich text content |
| `description` | Display description text |
| `Hidden Value` | Hidden field with value |
| `Redirect` | Redirect to URL |
| `Question Group` | Group of related sub-fields (see below) |
| `Table Input` | Table-based input |

#### Question Group

Groups multiple sub-fields into a single page/card in the form flow. Sub-fields are referenced by ID in the Question Group's `options.subFields` array.

**Creating Question Groups (API / Import):**

Sub-fields must be created as separate form field records **before** the Question Group that references them. Each sub-field must have:
- `isInGroup: true` — marks it as a sub-field so it doesn't appear as a standalone field
- `previousFields: []` — empty array (not part of the main form flow)

The Question Group field then references them via `options.subFields: [{ "id": "<sub-field-id>" }]`.

**Field ordering in exports/imports:** Place sub-fields **before** their parent Question Group in the `fields` array. The importer creates fields in order, so sub-fields must exist before the Question Group can reference them.

The next field in the main flow chains from the Question Group's ID, not from the last sub-field.

```json
// Step 1: Sub-fields (created first, with isInGroup: true)
{
  "id": "660000000000000000000034",
  "formId": "660000000000000000000001",
  "title": "I acknowledge the privacy policy",
  "type": "multiple_choice",
  "isOptional": false,
  "isInGroup": true,
  "previousFields": [],
  "options": { "choices": ["I agree"], "radio": false }
},
{
  "id": "660000000000000000000035",
  "formId": "660000000000000000000001",
  "title": "I acknowledge the terms of service",
  "type": "multiple_choice",
  "isOptional": false,
  "isInGroup": true,
  "previousFields": [],
  "options": { "choices": ["I agree"], "radio": false }
},

// Step 2: Question Group (references the sub-fields by ID)
{
  "id": "660000000000000000000033",
  "formId": "660000000000000000000001",
  "title": "Consent Acknowledgments",
  "type": "Question Group",
  "htmlDescription": "<p>Please review and agree to each of the following statements.</p>",
  "options": {
    "subFields": [
      { "id": "660000000000000000000034" },
      { "id": "660000000000000000000035" }
    ]
  },
  "previousFields": [
    { "type": "after", "info": { "fieldId": "<previous-field>" } }
  ]
}
```

#### Address Field

The built-in `Address` type collects street, city, state, and ZIP in a single question. Do not create separate text fields for each address component.

- Set `intakeField: "address"` to map to the patient record
- States are stored as **2-letter abbreviations** (e.g., "SC", "AL", "CA")
- For state-based conditional logic, reference the Address field ID in `compoundLogic` conditions

```json
{
  "title": "What is your address?",
  "type": "Address",
  "intakeField": "address"
}
```

#### Date vs DateString

| Type | UI Label | Use Case |
|------|----------|----------|
| `date` | "Date & Time" | Appointments, timestamps |
| `dateString` | "Date" | Date of Birth, date-only fields |

For Date of Birth, always use `dateString` with `intakeField: "dateOfBirth"`:
```json
{
  "title": "Date of Birth",
  "type": "dateString",
  "intakeField": "dateOfBirth"
}
```

---

## Field Options

Field options configure validation, display, and behavior.

### Validation Options

```typescript
{
  min?: number                            // Minimum value/date
  max?: number                            // Maximum value/date
  minLength?: number                      // Minimum text length
  maxLength?: number                      // Maximum text length
  default?: string                        // Default value
  repeat?: boolean                        // Allow multiple responses
}
```

### Choice Options

```typescript
{
  choices?: string[]                      // Available options
  radio?: boolean                         // true=radio, false=checkbox
  other?: boolean                         // Include "Other" option
  optionDetails?: Array<{                 // Option descriptions
    option: string                        // Option text (must match choices)
    description: string                   // Description shown below option
  }>
  autoAdvance?: boolean                   // Auto-advance on selection
}
```

### File Options

```typescript
{
  validFileTypes?: string[]               // ['Image', 'PDF', 'Document', 'Video']
  maxFileSize?: number                    // Max size in bytes
  hideFromPortal?: boolean                // Hide from patient portal
  autoUploadFiles?: boolean               // Auto-upload on selection
}
```

### Database Options

```typescript
{
  databaseId?: string                     // Database collection ID
  databaseLabel?: string                  // Primary display field
  databaseLabels?: string[]               // Additional display fields
  filterByEnduserState?: boolean          // Filter by patient state
  allowAddToDatabase?: boolean            // Allow creating new records
  databaseFilter?: {
    fieldId?: string
    databaseLabel?: string
  }
}
```

### Payment Options

```typescript
{
  productIds?: string[]                   // Payment products
  chargeImmediately?: boolean             // Charge on submission
  stripeCouponCodes?: string[]            // Valid coupon codes
  customPriceMessage?: string             // Custom price display
  stripeProductSelectionMode?: boolean    // Product selection mode
}
```

### Address Options

```typescript
{
  addressFields?: string[]                // ['line1', 'city', 'state', 'zip']
  validStates?: string[]                  // Restrict to states
  fullZIP?: boolean                       // Require 9-digit ZIP
}
```

### Display/Behavior Options

```typescript
{
  disableNext?: boolean                   // Prevent advancing past this field (hard stops)
  disableGoBack?: boolean                 // Prevent going back from this field
  subFields?: Array<{ id: string }>       // Sub-field IDs for Question Group fields
  saveIntakeOnPartial?: boolean           // Save intake data on partial submission
}
```

**Important:** `disableNext` and `disableGoBack` must be inside the `options` object, not at the field root level. Placing them at root level will be silently ignored on import.

### EHR Integration Options

```typescript
{
  dataSource?: string                     // 'Canvas', 'Elation', etc.
  observationCode?: string                // FHIR observation code
  observationDisplay?: string             // Display name
  observationUnit?: string                // Unit of measure
  canvasDocumentType?: { system, code }   // Canvas document type
  elationHistoryType?: string             // Elation history type
  elationAppendToNote?: boolean           // Append to Elation note
}
```

---

## Conditional Logic

### PreviousFormField Types

Control field ordering and conditional display. Each field's `previousFields` array defines when and where it appears in the form flow.

#### Root (First Field)
Every form must have exactly one root field — the entry point of the form.
```json
{
  "type": "root",
  "info": {}
}
```

#### After (Sequential / Default Branch)
Always show this field after the referenced field, regardless of response. This is the "Default" branch in the UI.
```json
{
  "type": "after",
  "info": {
    "fieldId": "507f1f77bcf86cd799439011"
  }
}
```

#### Previous Equals (Conditional Branch)
Show field only if the referenced field's response matches a specific value. Multiple `previousEquals` entries in the same `previousFields` array act as OR logic (field shows if **any** match).
```json
{
  "type": "previousEquals",
  "info": {
    "fieldId": "507f1f77bcf86cd799439011",
    "equals": "Yes"
  }
}
```

**Multi-source merge-back pattern:** A field can have multiple `previousFields` entries of different types to merge branches back together:
```json
{
  "previousFields": [
    { "type": "after", "info": { "fieldId": "<end-of-sub-branch>" } },
    { "type": "previousEquals", "info": { "fieldId": "<skip-field>", "equals": "No" } }
  ]
}
```

**Important:** `previousEquals` cannot express complex OR logic on the same source field (e.g., "field equals A OR B"). For that, use `compoundLogic`.

#### Compound Logic (Advanced Conditions)

Used for complex conditional branching: multi-value OR/AND, calculated field comparisons, and multi-field conditions.

**UI mapping:** Shows as "Advanced" Logic Type in the form builder with a priority dropdown and condition rows.

```typescript
{
  type: "compoundLogic",
  info: {
    fieldId: string,    // The source field ID being evaluated
    priority: number,   // Higher number = takes precedence when multiple conditions match
    label: string,      // Auto-generated label describing the condition
    condition: CompoundFilter  // The condition tree (see below)
  }
}
```

**Critical: `fieldId` controls evaluation timing, not just which field is tested.**

The form engine evaluates a `compoundLogic` condition when the field identified by `fieldId` is answered — not when the field it is attached to is rendered. This means:

- Any fields referenced inside `condition` that have **not yet been answered** at the time `fieldId` is answered will have `null` values, causing those sub-conditions to fail silently.
- Always set `fieldId` to the **last field answered** before the condition needs to be true.

**Example of the timing pitfall — branching after a shared pre-branch section:**

Suppose the form has: `branchQuestion` → `sharedQuestion` → `firstBranchAField` | `firstBranchBField`. If `firstBranchAField` uses `fieldId: branchQuestion` and its condition also checks `sharedQuestion`, that check evaluates when `branchQuestion` is answered — before `sharedQuestion` is ever shown — and always fails.

**Fix:** Use **two separate `compoundLogic` entries** in `previousFields`, each with its own `fieldId` pointing to the last relevant field in its path:

```json
"previousFields": [
  {
    "type": "compoundLogic",
    "info": {
      "fieldId": "<sharedQuestion>",
      "priority": 1,
      "label": "(Branch A) AND (sharedQuestion = optionX)",
      "condition": {
        "$and": [
          { "condition": { "<branchQuestion>": "Branch A answer" } },
          { "condition": { "<sharedQuestion>": "optionX" } }
        ]
      }
    }
  },
  {
    "type": "compoundLogic",
    "info": {
      "fieldId": "<conditionalFollowUp>",
      "priority": 1,
      "label": "(Branch A) AND (conditionalFollowUp = proceed)",
      "condition": {
        "$and": [
          { "condition": { "<branchQuestion>": "Branch A answer" } },
          { "condition": { "<conditionalFollowUp>": "proceed" } }
        ]
      }
    }
  }
]
```

Each entry fires at the correct moment: the first when `sharedQuestion` is answered, the second when the optional `conditionalFollowUp` is answered. Both also check `branchQuestion`, which is already answered by then.

##### CompoundFilter Format

The `condition` object uses Tellescope's `CompoundFilter` type. It is a recursive tree of `$or`, `$and`, and `condition` nodes.

```typescript
// From @tellescope/types-models
type CompoundFilter = {
  condition?: BasicFilter      // Leaf node: { "<fieldId>": "<value>" }
  $or?: CompoundFilter[]       // OR: true if ANY child matches
  $and?: CompoundFilter[]      // AND: true if ALL children match
}

type BasicFilter = {
  [fieldId: string]: string | number | null
    | { $gt: number }
    | { $lt: number }
    | { $exists: boolean }
    | { $contains: string | number }
    | { $doesNotContain: string | number }
}
```

**Key rules:**
- Each leaf condition is: `{ "condition": { "<fieldId>": "<value>" } }`
- For equality: value is a string (e.g., `"SC"`, `"Type 1 diabetes"`)
- For operators: value is an operator object (e.g., `{ "$lt": 18 }`)
- **Do NOT wrap `$or` branches in `$and`** — this changes the logic from OR to AND in the UI
- For multi-select (checkbox) fields, equality checks work because the engine uses `Array.includes()`

##### Calculated Fields in Conditions

Instead of a field ID, use these special identifiers to reference computed values:

| Identifier | Description | Operator Example |
|-----------|-------------|-----------------|
| `Calculated: Age` | Age computed from DOB field | `{ "$lt": 18 }` |
| `Calculated: BMI` | BMI from Height + Weight fields | `{ "$gt": 30 }` |
| `Calculated: Score` | Form scoring total | `{ "$gt": 10 }` |
| `Gender` | Patient gender value | `"Male"` |
| `State` | Patient state value | `"TX"` |

**Note:** `Calculated: Age` requires a `dateString` field with `computedValueKey: "Date of Birth"` in the form. The age is computed using `age_for_dob_mmddyyyy()`.

##### Example: Age Gate (Calculated Age < 18)
```json
{
  "type": "compoundLogic",
  "info": {
    "fieldId": "660000000000000000000009",
    "priority": 5,
    "label": "(Calculated: Age Less Than 18)",
    "condition": {
      "$or": [
        {
          "condition": {
            "Calculated: Age": { "$lt": 18 }
          }
        }
      ]
    }
  }
}
```

##### Example: State-Based Restriction (Address Field)
When using the built-in `Address` field type, states are 2-letter abbreviations.
```json
{
  "type": "compoundLogic",
  "info": {
    "fieldId": "66000000000000000000000b",
    "priority": 5,
    "label": "(SC OR AL OR CA)",
    "condition": {
      "$or": [
        { "condition": { "66000000000000000000000b": "SC" } },
        { "condition": { "66000000000000000000000b": "AL" } },
        { "condition": { "66000000000000000000000b": "CA" } }
      ]
    }
  }
}
```

##### Example: Multi-Select Branching with Dual Priorities
For checkbox fields where different selections lead to different branches, use separate `compoundLogic` entries with different priorities. Higher priority wins when multiple conditions match.

**Hard stop branch (priority 1 — loses to the explain branch):**
```json
{
  "type": "compoundLogic",
  "info": {
    "fieldId": "66000000000000000000001d",
    "priority": 1,
    "label": "(Type 1 diabetes OR Gallbladder disease OR Pancreatitis OR ...)",
    "condition": {
      "$or": [
        { "condition": { "66000000000000000000001d": "Type 1 diabetes" } },
        { "condition": { "66000000000000000000001d": "Gallbladder disease" } },
        { "condition": { "66000000000000000000001d": "Pancreatitis" } }
      ]
    }
  }
}
```

**Continue branch (priority 5 — wins over hard stop when both match):**
```json
{
  "type": "compoundLogic",
  "info": {
    "fieldId": "66000000000000000000001d",
    "priority": 5,
    "label": "(Type 2 diabetes OR High blood pressure OR ...)",
    "condition": {
      "$or": [
        { "condition": { "66000000000000000000001d": "Type 2 diabetes" } },
        { "condition": { "66000000000000000000001d": "High blood pressure" } }
      ]
    }
  }
}
```

### Default Branch + DQ Gate Pattern

When one answer is a disqualifying minority (e.g. "Female" on a sex question where the form is for males only), use `"after"` for the happy-path field and a conditional (`previousEquals` or `compoundLogic`) for the DQ field. The DQ field's `disableNext: true` blocks any patient who reaches it from advancing to the default-branch field.

**Why this works:** `"after"` is the lowest-priority branch. When the DQ condition matches, the DQ field is shown first and `disableNext` prevents the patient from ever reaching the `"after"` field. Non-DQ patients skip the DQ field entirely and follow the default `"after"` path.

```json
[
  {
    "id": "...<dq-field>...",
    "title": "Disqualified",
    "type": "Hidden Value",
    "isOptional": true,
    "previousFields": [
      {
        "type": "previousEquals",
        "info": { "fieldId": "<gate-field>", "equals": "Female" }
      }
    ],
    "options": { "default": "DQ", "disableNext": true }
  },
  {
    "id": "...<next-field>...",
    "title": "Next question for qualifying patients",
    "type": "stringLong",
    "previousFields": [
      {
        "type": "after",
        "info": { "fieldId": "<gate-field>" }
      }
    ]
  }
]
```

**DQ field type:** Use `Hidden Value` with `options.default: "DQ"` to silently record disqualification status without showing UI. Use `description` with `disableNext` when you want to display an explanation message to the patient.

### Hard Stop Pattern

A "hard stop" prevents form progression using a `description` field with `disableNext` and no fields chaining from it:

```json
{
  "id": "660000000000000000000100",
  "title": "We're unable to proceed with this program based on your responses.",
  "type": "description",
  "isOptional": true,
  "description": "Based on the information provided, certain medical conditions indicate this program may not be appropriate at this time.",
  "options": {
    "disableNext": true
  },
  "previousFields": [
    {
      "type": "compoundLogic",
      "info": { ... }
    }
  ]
}
```

**Key:** `disableNext` must be inside the `options` object, NOT at the field root level. Placing it at the root level will cause it to be silently ignored on import.

### Field Feedback

Show conditional messages based on responses.

```json
{
  "feedback": [
    {
      "ifEquals": "5",
      "display": "Great! You indicated excellent health."
    },
    {
      "ifEquals": "1",
      "display": "We recommend scheduling a follow-up appointment."
    }
  ]
}
```

---

## Form Customization

Visual and behavioral customization for public forms.

```typescript
interface FormCustomization {
  // Header/Content
  publicFormHTMLDescription?: string      // HTML above form
  publicFormSubmitHTMLDescription?: string // HTML after submission

  // Custom Labels
  publicLabelPrefix?: string              // Prefix for all labels
  publicFnameLabel?: string               // "First Name" label
  publicLnameLabel?: string               // "Last Name" label
  publicEmailLabel?: string               // "Email" label
  publicPhoneLabel?: string               // "Phone" label
  publicStateLabel?: string               // "State" label
  publicDateOfBirthLabel?: string         // "Date of Birth" label
  publicGenderLabel?: string              // "Gender" label

  // Theme
  primaryColor?: string                   // Buttons, progress bars (hex)
  secondaryColor?: string                 // Outlined buttons (hex)
  logoHeight?: number                     // Logo height in pixels
  maxWidth?: number                       // Max form width

  // UI Controls
  hideProgressBar?: boolean               // Hide progress indicator
  showRestartAtEnd?: boolean              // Show restart button
  hideLogo?: boolean                      // Hide organization logo
  hideBg?: boolean                        // Hide background
  multiPagePublicQuestions?: boolean      // Multi-page layout
  portalShowThanksAfterSubmission?: boolean
}
```

---

## Complete Examples

### Simple Intake Form
```json
{
  "exportedAt": "2025-01-19T12:00:00.000Z",
  "organizationId": "507f1f77bcf86cd799439011",
  "organizationName": "Example Clinic",
  "version": "1.0",
  "data": {
    "forms": [
      {
        "id": "507f1f77bcf86cd799439012",
        "title": "Patient Intake Form",
        "description": "Initial patient assessment",
        "numFields": 4,
        "type": "enduserFacing",
        "intakeEmailRequired": true,
        "intakePhone": "required",
        "thanksMessage": "Thank you for completing your intake form!",
        "tags": ["intake", "new-patient"],
        "customization": {
          "primaryColor": "#1976d2",
          "multiPagePublicQuestions": true
        },
        "fields": [
          {
            "id": "507f1f77bcf86cd799439013",
            "formId": "507f1f77bcf86cd799439012",
            "title": "What brings you in today?",
            "type": "stringLong",
            "placeholder": "Please describe your symptoms or concerns",
            "isOptional": false,
            "previousFields": [
              { "type": "root", "info": {} }
            ],
            "options": {
              "maxLength": 2000
            }
          },
          {
            "id": "507f1f77bcf86cd799439014",
            "formId": "507f1f77bcf86cd799439012",
            "title": "How would you rate your current health?",
            "type": "rating",
            "isOptional": false,
            "previousFields": [
              {
                "type": "after",
                "info": { "fieldId": "507f1f77bcf86cd799439013" }
              }
            ],
            "options": {
              "min": 1,
              "max": 5
            },
            "feedback": [
              {
                "ifEquals": "1",
                "display": "We're sorry to hear that. We'll prioritize your care."
              }
            ]
          },
          {
            "id": "507f1f77bcf86cd799439015",
            "formId": "507f1f77bcf86cd799439012",
            "title": "Do you have any allergies?",
            "type": "multiple_choice",
            "isOptional": false,
            "previousFields": [
              {
                "type": "after",
                "info": { "fieldId": "507f1f77bcf86cd799439014" }
              }
            ],
            "options": {
              "choices": ["Yes", "No"],
              "radio": true
            }
          },
          {
            "id": "507f1f77bcf86cd799439016",
            "formId": "507f1f77bcf86cd799439012",
            "title": "Please list your allergies",
            "type": "Allergies",
            "isOptional": true,
            "previousFields": [
              {
                "type": "previousEquals",
                "info": {
                  "fieldId": "507f1f77bcf86cd799439015",
                  "equals": "Yes"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Appointment Booking Form
```json
{
  "data": {
    "forms": [
      {
        "id": "507f1f77bcf86cd799439020",
        "title": "Schedule Your Appointment",
        "numFields": 3,
        "type": "enduserFacing",
        "allowPublicURL": true,
        "intakeEmailRequired": true,
        "intakePhone": "optional",
        "fields": [
          {
            "id": "507f1f77bcf86cd799439021",
            "formId": "507f1f77bcf86cd799439020",
            "title": "What type of visit do you need?",
            "type": "Dropdown",
            "previousFields": [{ "type": "root", "info": {} }],
            "options": {
              "choices": [
                "Annual Physical",
                "Follow-up Visit",
                "Sick Visit",
                "Consultation"
              ]
            }
          },
          {
            "id": "507f1f77bcf86cd799439022",
            "formId": "507f1f77bcf86cd799439020",
            "title": "Additional notes for your provider",
            "type": "stringLong",
            "isOptional": true,
            "previousFields": [
              {
                "type": "after",
                "info": { "fieldId": "507f1f77bcf86cd799439021" }
              }
            ]
          },
          {
            "id": "507f1f77bcf86cd799439023",
            "formId": "507f1f77bcf86cd799439020",
            "title": "Select your appointment time",
            "type": "Appointment Booking",
            "previousFields": [
              {
                "type": "after",
                "info": { "fieldId": "507f1f77bcf86cd799439022" }
              }
            ],
            "options": {
              "bookingPageId": "507f1f77bcf86cd799439030"
            }
          }
        ]
      }
    ]
  }
}
```

### Payment Collection Form
```json
{
  "data": {
    "forms": [
      {
        "id": "507f1f77bcf86cd799439040",
        "title": "Payment",
        "numFields": 2,
        "type": "enduserFacing",
        "fields": [
          {
            "id": "507f1f77bcf86cd799439041",
            "formId": "507f1f77bcf86cd799439040",
            "title": "Select your plan",
            "type": "multiple_choice",
            "previousFields": [{ "type": "root", "info": {} }],
            "options": {
              "choices": ["Monthly ($99/month)", "Annual ($999/year)"],
              "radio": true
            }
          },
          {
            "id": "507f1f77bcf86cd799439042",
            "formId": "507f1f77bcf86cd799439040",
            "title": "Payment Information",
            "type": "Stripe",
            "previousFields": [
              {
                "type": "after",
                "info": { "fieldId": "507f1f77bcf86cd799439041" }
              }
            ],
            "options": {
              "productIds": ["prod_ABC123", "prod_DEF456"],
              "chargeImmediately": true,
              "stripeCouponCodes": ["WELCOME10"]
            }
          }
        ]
      }
    ]
  }
}
```
