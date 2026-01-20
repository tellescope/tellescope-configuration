# Template Schema Reference

This document describes the structure of Tellescope templates, including MessageTemplates, CalendarEventTemplates, TicketTemplates, and template variable syntax.

## Table of Contents
- [MessageTemplate Structure](#messagetemplate-structure)
- [CalendarEventTemplate Structure](#calendareventtemplate-structure)
- [TicketTemplate Structure](#tickettemplate-structure)
- [MessageTemplateSnippet Structure](#messagettemplatesnippet-structure)
- [Template Variables](#template-variables)
- [Link Syntax](#link-syntax)
- [Complete Examples](#complete-examples)

---

## MessageTemplate Structure

Message templates are used for emails, SMS, and chat messages.

```typescript
interface MessageTemplate {
  // Required
  id: string                              // MongoDB ObjectId (24-char hex)
  title: string                           // Template name (max 100 chars)
  subject: string                         // Email subject (max 250 chars)
  message: string                         // Plain text content (max 100,000 chars)

  // Optional Content
  html?: string                           // HTML content (max 100,000 chars)
  editorState?: string                    // Draft.js editor state (JSON-stringified)

  // Categorization
  type?: 'enduser' | 'Reply' | 'team'     // Recipient type
  mode?: 'html' | 'richtext'              // Rendering mode
  forChannels?: string[]                  // ['Email', 'SMS', 'Chat'] - optional, filters where template appears
  forRoles?: string[]                     // Limit to user roles
  forEntityTypes?: string[]               // Limit to entity types
  tags?: string[]                         // Searchable tags

  // Behavior
  isMarketing?: boolean                   // Marketing classification
  hideFromCompose?: boolean               // Hide from template picker
  mmsAttachmentURLs?: string[]            // Attachment URLs for SMS

  // Lifecycle
  archivedAt?: Date | ''                  // Soft delete timestamp
}
```

### MessageTemplate Example
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Appointment Reminder",
  "subject": "Reminder: Your appointment on {{calendar_event.start_date}}",
  "message": "Hi {{enduser.fname}},\n\nThis is a reminder about your upcoming appointment with {{calendar_event.host}} on {{calendar_event.start_date_time}}.\n\nLocation: {{calendar_event.location.address}}\n\nPlease arrive 15 minutes early.\n\nBest,\n{{sender}}",
  "html": "<p>Hi {{enduser.fname}},</p><p>This is a reminder about your upcoming appointment with {{calendar_event.host}} on {{calendar_event.start_date_time}}.</p><p><strong>Location:</strong> {{calendar_event.location.address}}</p><p>Please arrive 15 minutes early.</p><p>Best,<br>{{sender}}</p>",
  "type": "enduser",
  "mode": "html",
  "forChannels": ["Email", "SMS"],
  "tags": ["reminders", "appointments"],
  "isMarketing": false
}
```

### Field Notes

**forChannels**: Optional array that filters where the template appears in the UI. If omitted, the template is available for all channels. Common values: `"Email"`, `"SMS"`, `"Chat"`.

**editorState**: JSON-stringified Draft.js editor state used by the rich text editor. Format:
```json
{
  "blocks": [
    {
      "key": "abc123",
      "text": "Message content",
      "type": "unstyled",
      "depth": 0,
      "inlineStyleRanges": [],
      "entityRanges": [],
      "data": {}
    }
  ],
  "entityMap": {}
}
```

**subject**: Required for all templates. For SMS-only templates, can be set to an empty string `""` or a short identifier.

---

## CalendarEventTemplate Structure

Calendar event templates define appointment types.

```typescript
interface CalendarEventTemplate {
  // Required
  id: string                              // MongoDB ObjectId
  title: string                           // Appointment type name (max 250 chars)
  durationInMinutes: number               // Default duration (non-negative)

  // Display
  description?: string                    // Appointment description
  type?: string                           // Appointment category
  color?: string                          // Calendar color (hex)

  // Video Settings
  enableVideoCall?: boolean               // Enable video calling
  videoIntegration?: 'Zoom' | 'No Integration'
  generateZoomLinkWhenBooked?: boolean

  // Self-Scheduling
  enableSelfScheduling?: boolean          // Allow patient booking
  bookableByEnduser?: boolean             // Patient can book
  bufferBetweenAppointments?: number      // Buffer time in minutes

  // Reminders
  reminders?: CalendarEventReminder[]     // Automated reminders

  // Care Plan Integration
  carePlanTasks?: string[]                // Tasks to create
  carePlanForms?: string[]                // Form IDs to send
  carePlanContent?: string[]              // Content IDs to share
  carePlanFiles?: string[]                // File IDs to share

  // EHR Integration
  athenaAppointmentTypeId?: string
  athenaDocumentIds?: string[]
  canvasSyncCreateAppointment?: boolean
  elationCreateEncounter?: boolean
  healthieSync?: boolean

  // Restrictions
  validStates?: string[]                  // Limit to patient states
  productIds?: string[]                   // Require product purchase
  tags?: string[]

  // Lifecycle
  archivedAt?: Date | ''
}

interface CalendarEventReminder {
  type: 'webhook' | 'add-to-journey' | 'send-form' | 'send-email' | 'send-sms'
  info: {
    // Timing
    offsetInMinutes?: number              // Minutes before appointment
    offsetDirection?: 'before' | 'after'

    // Action-specific
    journeyId?: string                    // For add-to-journey
    formId?: string                       // For send-form
    templateId?: string                   // For send-email/send-sms
    webhookURL?: string                   // For webhook
  }
}
```

### CalendarEventTemplate Example
```json
{
  "id": "507f1f77bcf86cd799439020",
  "title": "Initial Consultation",
  "durationInMinutes": 60,
  "description": "First appointment with new patients",
  "color": "#4CAF50",
  "enableVideoCall": true,
  "videoIntegration": "Zoom",
  "generateZoomLinkWhenBooked": true,
  "enableSelfScheduling": true,
  "reminders": [
    {
      "type": "send-email",
      "info": {
        "offsetInMinutes": 1440,
        "offsetDirection": "before",
        "templateId": "507f1f77bcf86cd799439011"
      }
    },
    {
      "type": "send-sms",
      "info": {
        "offsetInMinutes": 60,
        "offsetDirection": "before",
        "templateId": "507f1f77bcf86cd799439012"
      }
    }
  ],
  "tags": ["consultation", "new-patient"]
}
```

---

## TicketTemplate Structure

Ticket templates predefine support ticket fields.

```typescript
interface TicketTemplate {
  // Required
  id: string                              // MongoDB ObjectId
  title: string                           // Template name (max 250 chars)

  // Preset Fields
  type?: string                           // Ticket type (max 100 chars)
  stage?: string                          // Initial stage (max 100 chars)
  priority?: number                       // Priority level
  tags?: string[]                         // Ticket tags

  // Lifecycle
  archivedAt?: Date | ''
}
```

### TicketTemplate Example
```json
{
  "id": "507f1f77bcf86cd799439030",
  "title": "Patient Callback Request",
  "type": "callback",
  "stage": "open",
  "priority": 2,
  "tags": ["callback", "urgent"]
}
```

---

## MessageTemplateSnippet Structure

Snippets are reusable text fragments that can be inserted into templates.

```typescript
interface MessageTemplateSnippet {
  id: string                              // MongoDB ObjectId
  key: string                             // Reference key (e.g., "disclaimer")
  value: string                           // Snippet content
}
```

### Snippet Example
```json
{
  "id": "507f1f77bcf86cd799439040",
  "key": "legal_disclaimer",
  "value": "This message may contain confidential health information. If you are not the intended recipient, please delete this message and notify the sender."
}
```

Use in templates: `{{snippet:legal_disclaimer}}`

---

## Template Variables

Templates support `{{variable}}` syntax for dynamic content substitution.

### Patient (Enduser) Variables

| Variable | Description |
|----------|-------------|
| `{{enduser.fname}}` | First name (auto-capitalized) |
| `{{enduser.lname}}` | Last name |
| `{{enduser.id}}` | Patient ID |
| `{{enduser.email}}` | Email address |
| `{{enduser.phone}}` | Phone number |
| `{{enduser.Age}}` | Calculated age from DOB |
| `{{enduser.BMI}}` | Calculated BMI |
| `{{enduser.height.value}}` | Height numeric value |
| `{{enduser.height.unit}}` | Height unit (cm/in) |
| `{{enduser.weight.value}}` | Weight numeric value |
| `{{enduser.weight.unit}}` | Weight unit (kg/lb) |
| `{{enduser.dateOfBirth}}` | Date of birth |
| `{{enduser.state}}` | State/region |
| `{{enduser.profileURL}}` | Link to patient profile |
| `{{enduser.[customField]}}` | Any custom field value |
| `{{enduser.insurance.payerName}}` | Primary insurance payer |
| `{{enduser.insuranceSecondary.payerName}}` | Secondary insurance payer |

### Sender (User) Variables

| Variable | Description |
|----------|-------------|
| `{{sender}}` | User display name |
| `{{sender.fname}}` | First name |
| `{{sender.lname}}` | Last name |
| `{{sender.email}}` | Email address |
| `{{sender.phone}}` | Phone number |
| `{{sender.url}}` | Custom URL field |
| `{{sender.bio}}` | Biography |
| `{{sender.[customField]}}` | Custom template fields |
| `{{SIGNATURE}}` | Email signature (all channels) |
| `{{SIGNATURE.EMAIL}}` | Email signature (email only) |

### Organization Variables

| Variable | Description |
|----------|-------------|
| `{{organization.name}}` | Organization name |
| `{{organization.themeColor}}` | Brand color (hex) |
| `{{organization.themeColorSecondary}}` | Secondary brand color |
| `{{organization.logo}}` | Logo URL |

### Calendar Event Variables

| Variable | Description |
|----------|-------------|
| `{{calendar_event.title}}` | Appointment title |
| `{{calendar_event.start_date_time}}` | Full date/time (patient timezone) |
| `{{calendar_event.start_date}}` | Date only |
| `{{calendar_event.start_time}}` | Time only |
| `{{calendar_event.location}}` | Location title |
| `{{calendar_event.location.address}}` | Full address with Google Maps link |
| `{{calendar_event.location.instructions}}` | Location instructions |
| `{{calendar_event.videoURL}}` | Video conference URL |
| `{{calendar_event.instructions}}` | Event instructions |
| `{{calendar_event.host}}` | Host display name |
| `{{calendar_event.host.fname}}` | Host first name |
| `{{calendar_event.host.email}}` | Host email |
| `{{calendar_event.add_to_gcal_link}}` | Google Calendar add link |

### Form & Document Variables

| Variable | Description |
|----------|-------------|
| `{{forms.[formId].link:[text]}}` | Form link with custom text |
| `{{forms.[formId].[fieldName]}}` | Form field value |
| `{{form_groups.[groupId].link:[text]}}` | Form group link |
| `{{form_response.id}}` | Related form response ID |
| `{{form_response.[fieldName]}}` | Form response field value |
| `{{files.[fileId].link:[text]}}` | File download link |
| `{{content.[contentId].link:[text]}}` | Content link |

### Portal Link Variables

| Variable | Description |
|----------|-------------|
| `{{portal.link.courses:[text]}}` | Link to courses |
| `{{portal.link.care-plan:[text]}}` | Link to care plan |
| `{{portal.link.documents:[text]}}` | Link to documents |
| `{{portal.link.form-responses:[text]}}` | Link to form responses |
| `{{portal.link.appointments:[text]}}` | Link to appointments |
| `{{portal.link.messages:[text]}}` | Link to messages |

### Related Contact Variables

| Variable | Description |
|----------|-------------|
| `{{relatedcontact.fname}}` | Related contact first name |
| `{{relatedcontact.lname}}` | Related contact last name |
| `{{relatedcontact.[field]}}` | Any related contact field |

### Other Variables

| Variable | Description |
|----------|-------------|
| `{{name}}` | Shorthand for `{{enduser.fname}}` |
| `{{CURRENT_DATE}}` | Current date (America/New_York) |
| `{{snippet:[key]}}` | Insert reusable snippet |
| `{{eligibility_result.summary}}` | Insurance eligibility summary |

### Date Formatting

Date fields are automatically formatted in the patient's timezone. Custom date fields from `enduser.fields` are also auto-formatted.

---

## Link Syntax

Templates support special link formatting for tracked URLs.

### Basic Link
```
{URL}[Display Text]
```

Example:
```
{https://example.com/schedule}[Schedule your appointment]
```

- In **Email**: Creates styled HTML anchor tag
- In **SMS**: Creates shortened, tracked link
- All links are tracked for analytics

### Link Without Text (SMS)
```
{URL}[$LINK_ONLY]
```

Creates a tracked link without display text.

### Links with CSS Styling
```
<style>
a { color: #1976d2; text-decoration: none; }
</style>
{https://example.com}[Click here]
```

---

## Complete Examples

### Welcome Email Template
```json
{
  "exportedAt": "2025-01-19T12:00:00.000Z",
  "organizationId": "507f1f77bcf86cd799439011",
  "organizationName": "Example Clinic",
  "version": "1.0",
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439050",
        "title": "Welcome Email",
        "subject": "Welcome to {{organization.name}}!",
        "message": "Hi {{enduser.fname}},\n\nWelcome to {{organization.name}}! We're excited to have you as a patient.\n\nTo get started, please complete your intake form:\n{{forms.507f1f77bcf86cd799439060.link:Complete Intake Form}}\n\nIf you have any questions, simply reply to this email.\n\nBest regards,\n{{sender}}\n\n{{snippet:legal_disclaimer}}",
        "html": "<p>Hi {{enduser.fname}},</p><p>Welcome to {{organization.name}}! We're excited to have you as a patient.</p><p>To get started, please complete your intake form:</p><p>{{forms.507f1f77bcf86cd799439060.link:Complete Intake Form}}</p><p>If you have any questions, simply reply to this email.</p><p>Best regards,<br>{{sender}}</p><hr><p style=\"font-size: 12px; color: #666;\">{{snippet:legal_disclaimer}}</p>",
        "type": "enduser",
        "mode": "html",
        "forChannels": ["Email"],
        "tags": ["welcome", "onboarding"]
      }
    ],
    "message_template_snippets": [
      {
        "id": "507f1f77bcf86cd799439051",
        "key": "legal_disclaimer",
        "value": "This message may contain confidential health information protected by HIPAA. If you are not the intended recipient, please delete this message immediately."
      }
    ]
  }
}
```

### Appointment Reminder Templates
```json
{
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439060",
        "title": "Appointment Reminder - Email",
        "subject": "Reminder: Appointment on {{calendar_event.start_date}}",
        "message": "Hi {{enduser.fname}},\n\nThis is a reminder about your upcoming appointment:\n\nDate: {{calendar_event.start_date}}\nTime: {{calendar_event.start_time}}\nProvider: {{calendar_event.host}}\n\n{{calendar_event.videoURL}}\n\nNeed to reschedule? {{portal.link.appointments:Manage your appointments}}\n\nSee you soon!\n{{sender}}",
        "html": "<p>Hi {{enduser.fname}},</p><p>This is a reminder about your upcoming appointment:</p><table><tr><td><strong>Date:</strong></td><td>{{calendar_event.start_date}}</td></tr><tr><td><strong>Time:</strong></td><td>{{calendar_event.start_time}}</td></tr><tr><td><strong>Provider:</strong></td><td>{{calendar_event.host}}</td></tr></table><p>{{calendar_event.videoURL}}</p><p>Need to reschedule? {{portal.link.appointments:Manage your appointments}}</p><p>See you soon!<br>{{sender}}</p>",
        "type": "enduser",
        "mode": "html",
        "forChannels": ["Email"],
        "tags": ["reminders", "appointments"]
      },
      {
        "id": "507f1f77bcf86cd799439061",
        "title": "Appointment Reminder - SMS",
        "subject": "",
        "message": "Hi {{enduser.fname}}, reminder: You have an appointment on {{calendar_event.start_date}} at {{calendar_event.start_time}} with {{calendar_event.host}}. {{calendar_event.videoURL}}",
        "type": "enduser",
        "forChannels": ["SMS"],
        "tags": ["reminders", "appointments"]
      }
    ],
    "calendar_event_templates": [
      {
        "id": "507f1f77bcf86cd799439070",
        "title": "Follow-up Visit",
        "durationInMinutes": 30,
        "description": "Standard follow-up appointment",
        "enableVideoCall": true,
        "videoIntegration": "Zoom",
        "generateZoomLinkWhenBooked": true,
        "enableSelfScheduling": true,
        "reminders": [
          {
            "type": "send-email",
            "info": {
              "offsetInMinutes": 1440,
              "offsetDirection": "before",
              "templateId": "507f1f77bcf86cd799439060"
            }
          },
          {
            "type": "send-sms",
            "info": {
              "offsetInMinutes": 60,
              "offsetDirection": "before",
              "templateId": "507f1f77bcf86cd799439061"
            }
          }
        ],
        "tags": ["follow-up"]
      }
    ]
  }
}
```

### Internal Team Notification
```json
{
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439080",
        "title": "High Risk Patient Alert",
        "subject": "High Risk: {{enduser.fname}} {{enduser.lname}}",
        "message": "A patient has been flagged as high risk.\n\nPatient: {{enduser.fname}} {{enduser.lname}}\nAge: {{enduser.Age}}\n\nView profile: {{enduser.profileURL}}\n\nPlease follow up promptly.",
        "type": "team",
        "forChannels": ["Email"],
        "tags": ["alerts", "internal", "high-risk"]
      }
    ]
  }
}
```

### Form Submission Confirmation
```json
{
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439090",
        "title": "Form Submission Confirmation",
        "subject": "Thank you for your submission",
        "message": "Hi {{enduser.fname}},\n\nThank you for completing your {{form_response.formTitle}}.\n\nWe've received your information and our team will review it shortly.\n\nYou can view your responses anytime: {{portal.link.form-responses:View your submissions}}\n\nBest,\n{{organization.name}} Team",
        "type": "enduser",
        "forChannels": ["Email", "SMS"],
        "tags": ["forms", "confirmation"]
      }
    ]
  }
}
```
