# Tellescope Configuration Repository

This repository stores example Tellescope configuration files and comprehensive schema documentation for use with Claude Code.

## Purpose

- Store example configuration exports from Tellescope
- Document configuration schemas for AI-assisted generation
- Enable Claude Code to generate new configurations based on examples

## Repository Structure

```
tellescope-configuration/
├── CLAUDE.md              # AI instructions and quick reference
├── README.md              # This file
├── examples/
│   ├── models/            # Individual model examples
│   │   ├── automations/   # Journey and trigger examples
│   │   ├── forms/         # Form configuration examples
│   │   └── templates/     # Message template examples
│   └── workflows/         # Complete multi-model workflows
└── schemas/               # Detailed schema documentation
    ├── automation-schema.md
    ├── form-schema.md
    └── template-schema.md
```

## Usage with Claude Code

1. Open this directory with Claude Code
2. Claude will read `CLAUDE.md` and understand the configuration patterns
3. Ask Claude to generate new configurations based on your requirements
4. Claude will reference schemas and examples to produce valid JSON

## Adding Examples

### Individual Models
Place single-model exports in the appropriate `examples/models/` subdirectory:
- `examples/models/automations/` - Journeys and automation triggers
- `examples/models/forms/` - Form configurations
- `examples/models/templates/` - Message and calendar templates

### Workflows
Place multi-model exports in `examples/workflows/` with descriptive names:
- `patient-onboarding.json`
- `appointment-reminders.json`
- `intake-workflow.json`

## Schema Documentation

See the `schemas/` directory for comprehensive documentation:
- [automation-schema.md](schemas/automation-schema.md) - Journeys, steps, triggers, actions
- [form-schema.md](schemas/form-schema.md) - Forms, fields, options, validation
- [template-schema.md](schemas/template-schema.md) - Message templates, variables, calendar events

## Export Format

All exports follow this structure:
```json
{
  "exportedAt": "2025-01-19T12:00:00.000Z",
  "organizationId": "...",
  "organizationName": "...",
  "version": "1.0",
  "data": {
    "journeys": [],
    "automation_triggers": [],
    "forms": [],
    "templates": [],
    "calendar_event_templates": []
  }
}
```
