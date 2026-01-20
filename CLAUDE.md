# Tellescope Configuration Repository

This repository contains example Tellescope configuration files and comprehensive schema documentation. Use this to understand configuration structures and generate new configurations.

## Repository Structure

```
tellescope-configuration/
├── examples/
│   ├── models/              # Individual model examples
│   │   ├── automations/     # Journey and automation trigger examples
│   │   ├── forms/           # Form configuration examples
│   │   └── templates/       # Message template examples
│   └── workflows/           # Complete multi-model workflow configurations
└── schemas/                 # Detailed schema documentation
    ├── automation-schema.md
    ├── form-schema.md
    └── template-schema.md
```

## How to Navigate This Repository

### Finding Examples
- **Individual models**: Look in `examples/models/{type}/` for single automations, forms, or templates
- **Complete workflows**: Look in `examples/workflows/` for configurations combining multiple models

### Understanding Schemas
- Before generating new configurations, read the relevant schema file in `schemas/`
- Each schema file contains field definitions, validation rules, and complete examples

## Quick Reference

### Export File Structure
All Tellescope configuration exports follow this root structure:
```json
{
  "exportedAt": "2025-01-19T12:00:00.000Z",
  "organizationId": "507f1f77bcf86cd799439011",
  "organizationName": "Organization Name",
  "version": "1.0",
  "data": {
    "journeys": [],
    "automation_triggers": [],
    "forms": [],
    "templates": [],
    "calendar_event_templates": [],
    "databases": []
  }
}
```

### Key Model Types

| Model | Schema File | Description |
|-------|-------------|-------------|
| Journey | [automation-schema.md](schemas/automation-schema.md) | Patient workflows with states and automation steps |
| AutomationTrigger | [automation-schema.md](schemas/automation-schema.md) | Standalone event-driven rules |
| Form | [form-schema.md](schemas/form-schema.md) | Patient-facing or internal forms with fields |
| MessageTemplate | [template-schema.md](schemas/template-schema.md) | Email, SMS, and chat message templates |
| CalendarEventTemplate | [template-schema.md](schemas/template-schema.md) | Appointment type definitions |

### Common ID Patterns
- All IDs are 24-character MongoDB ObjectId hex strings (e.g., `"507f1f77bcf86cd799439011"`)
- When generating new configurations, use placeholder IDs - they will be remapped on import
- Reference IDs within the same export will be automatically updated to maintain relationships

## Generating New Configurations

### Step 1: Understand Requirements
1. What models are needed? (journeys, forms, templates, triggers)
2. How do they connect? (forms referenced in automations, templates used in actions)
3. What's the workflow goal?

### Step 2: Reference Schemas
- Read the relevant schema files for complete field documentation
- Pay attention to required vs optional fields
- Check validation constraints (string lengths, allowed values)

### Step 3: Use Examples as Starting Points
- Find similar examples in `examples/models/` or `examples/workflows/`
- Modify rather than creating from scratch when possible

### Step 4: Validate Structure
Ensure:
- All referenced IDs exist within the export or use valid placeholder IDs
- Required fields are present
- Field types match expected formats
- Nested structures follow documented patterns

## Template Variable Quick Reference

Templates support `{{variable}}` syntax for dynamic content:

### Patient Variables
```
{{enduser.fname}}              # First name
{{enduser.lname}}              # Last name
{{enduser.Age}}                # Calculated age
{{enduser.[customField]}}      # Custom fields
```

### Sender Variables
```
{{sender}}                     # Display name
{{sender.fname}}               # First name
{{sender.email}}               # Email
{{SIGNATURE}}                  # Email signature
```

### Calendar Event Variables
```
{{calendar_event.title}}
{{calendar_event.start_date_time}}
{{calendar_event.videoURL}}
{{calendar_event.host}}
```

### Link Syntax
```
{{forms.[formId].link:[Link Text]}}
{{portal.link.[destination]:[Link Text]}}
```

See [template-schema.md](schemas/template-schema.md) for complete variable reference.

## Automation Action Quick Reference

Common action types for journey steps and triggers:

| Action Type | Purpose |
|------------|---------|
| `sendEmail` | Send email using template |
| `sendSMS` | Send SMS using template |
| `sendForm` | Send form to patient |
| `addToJourney` | Enroll patient in journey |
| `removeFromJourney` | Remove patient from journey |
| `setEnduserFields` | Update patient fields |
| `addEnduserTags` | Add tags to patient |
| `createTicket` | Create support ticket |
| `createCarePlan` | Create care plan |
| `sendWebhook` | Call external webhook |

See [automation-schema.md](schemas/automation-schema.md) for all 40+ action types.

## Form Field Quick Reference

Common field types:

| Field Type | Purpose |
|-----------|---------|
| `string` | Short text input |
| `stringLong` | Multi-line text |
| `multiple_choice` | Radio or checkbox options |
| `Dropdown` | Dropdown select |
| `date` | Date picker |
| `rating` | Numeric rating |
| `file` / `files` | File upload |
| `signature` | Signature capture |
| `Address` | Address with components |
| `Appointment Booking` | Self-scheduling |

See [form-schema.md](schemas/form-schema.md) for all 34 field types.

## Configuration Validator

The repository includes a validator that checks generated configurations for errors. Use it to validate your work before importing.

### Running the Validator

```bash
# First time setup (from repository root)
cd validator && npm install && npm run build && cd ..

# Validate a configuration file
node validator/dist/cli.js path/to/config.json
```

### Validator Output

The validator outputs JSON with:
- `valid`: Whether the configuration passed validation
- `errors`: Array of validation errors with paths and fix suggestions
- `summary`: Count of errors/warnings and models validated

### Error Format

Each error includes:
```json
{
  "code": "STRING_TOO_LONG",
  "message": "Journey title exceeds maximum length of 100 characters",
  "path": "data.journeys[0].title",
  "severity": "error",
  "expected": "string with max 100 characters",
  "actual": "...",
  "suggestion": {
    "type": "replace",
    "targetPath": "data.journeys[0].title",
    "value": "Truncated title...",
    "description": "Truncate to 100 characters",
    "confidence": "low"
  }
}
```

### Claude Code Workflow

When generating configurations:
1. Generate the configuration JSON
2. Run: `node validator/dist/cli.js config.json`
3. Parse the JSON output for errors
4. For each error:
   - Use `error.path` to locate the issue
   - Apply `error.suggestion` if confidence is high
   - Fix manually if confidence is low
5. Re-run validator until `valid: true`

### Common Error Codes

| Code | Description |
|------|-------------|
| `STRING_TOO_LONG` | Field exceeds max length (title: 100, message: 100k) |
| `INVALID_OBJECT_ID` | ID is not a valid 24-character hex string |
| `MISSING_REQUIRED_FIELD` | Required field is missing or empty |
| `REFERENCE_NOT_FOUND` | ID references a model that doesn't exist in export |
| `INVALID_ENUM_VALUE` | Value is not in the allowed set |
| `UNCLOSED_VARIABLE` | Template variable missing closing `}}` |
| `FIELD_COUNT_MISMATCH` | Form numFields doesn't match actual field count |

### CLI Options

```bash
# Output to file
node validator/dist/cli.js config.json -o results.json

# Validate only specific models
node validator/dist/cli.js config.json --only journeys,forms

# Generate auto-fixed config (high confidence fixes only)
node validator/dist/cli.js config.json --fix-file fixed-config.json

# Skip warnings
node validator/dist/cli.js config.json --no-warnings
```

## Best Practices

1. **Use descriptive titles**: Journeys, forms, and templates should have clear, descriptive names
2. **Add tags**: Use tags for organization and filtering
3. **Include descriptions**: Help future maintainers understand purpose
4. **Test incrementally**: Import small configurations first to validate
5. **Document dependencies**: Note which forms/templates are used by which automations
6. **Validate before importing**: Always run the validator on generated configurations
