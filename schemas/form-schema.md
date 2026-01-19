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
}
```

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
| `date` | Date picker | `min`, `max`, `useDatePicker` |
| `dateString` | Date as string | - |
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
| `Question Group` | Group of related fields |
| `Table Input` | Table-based input |

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
    label: string
    description: string
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

Control field ordering and conditional display.

#### Root (First Field)
```json
{
  "type": "root",
  "info": {}
}
```

#### After (Sequential)
```json
{
  "type": "after",
  "info": {
    "fieldId": "507f1f77bcf86cd799439011"
  }
}
```

#### Previous Equals (Conditional)
Show field only if previous field has specific value.
```json
{
  "type": "previousEquals",
  "info": {
    "fieldId": "507f1f77bcf86cd799439011",
    "equals": "Yes"
  }
}
```

#### Compound Logic (Complex Conditions)
```json
{
  "type": "compoundLogic",
  "info": {
    "fieldId": "507f1f77bcf86cd799439011",
    "priority": 1,
    "label": "Show if high risk",
    "condition": {
      // Complex filter object
    }
  }
}
```

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
