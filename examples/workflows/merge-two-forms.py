"""
Merge two Tellescope form exports into one unified form.

Usage:
    python merge-two-forms.py base-form.json append-form.json output.json

The appended form's root field is connected to the last field of the base form
via an unconditional `after` link.

Key safety rules (see schemas/form-schema.md#merging-two-forms for full details):
- Only the original field set (containing the `root` field) is used from the
  appended form; re-import artifact sets are discarded.
- All appended field IDs are replaced with fresh random IDs to avoid Tellescope's
  field-deduplication behavior, which would otherwise create floating duplicate
  copies on the canvas.
- Delete any previous merged form imports from your Tellescope account before
  importing the output file.
"""

import json
import os
import sys
import binascii


def merge_forms(base_path: str, append_path: str, output_path: str,
                base_last_field_id: str, merged_title: str) -> None:
    with open(base_path) as f:
        base_data = json.load(f)
    with open(append_path) as f:
        append_data = json.load(f)

    base_form = base_data["data"]["forms"][0]
    append_form = append_data["data"]["forms"][0]

    # Find the original field set: the one whose fields include a `root` previousField.
    # A re-imported form contains multiple parallel sets; only the original is usable.
    root_prefix = next(
        (f["id"][:8] for f in append_form["fields"]
         if any(p.get("type") == "root" for p in f.get("previousFields", []))),
        None,
    )
    if root_prefix is None:
        raise ValueError("Could not find a field with previousFields type=root in the appended form")

    # Filter to original set only, remove Redirect fields
    append_fields_raw = [
        f for f in append_form["fields"]
        if f["id"].startswith(root_prefix) and f.get("type") != "Redirect"
    ]
    print(f"Base fields:   {len(base_form['fields'])}")
    print(f"Append fields: {len(append_fields_raw)} (original set '{root_prefix}...', Redirect removed)")

    # Generate fresh random IDs for all appended fields
    old_ids = [f["id"] for f in append_fields_raw]
    id_map = {old: binascii.hexlify(os.urandom(12)).decode() for old in old_ids}

    # Remap all ID occurrences in serialized JSON (covers fieldId refs and condition keys)
    append_json = json.dumps(append_fields_raw)
    for old, new in id_map.items():
        append_json = append_json.replace(f'"{old}"', f'"{new}"')
    append_fields = json.loads(append_json)

    # Verify no old IDs remain
    remaining = [oid for oid in old_ids if f'"{oid}"' in append_json]
    assert not remaining, f"Old IDs still present after remapping: {remaining}"

    # Connect appended root field to the end of the base form
    root_field = next(
        f for f in append_fields
        if any(p.get("type") == "root" for p in f.get("previousFields", []))
    )
    root_field["previousFields"] = [{"type": "after", "info": {"fieldId": base_last_field_id}}]

    # New unique form ID
    new_form_id = binascii.hexlify(os.urandom(12)).decode()

    # Update formId on all fields; strip originalId from appended fields
    for f in append_fields:
        f["formId"] = new_form_id
        f.pop("originalId", None)
    for f in base_form["fields"]:
        f["formId"] = new_form_id

    # Offset appended field Y coordinates so they appear below base fields on canvas
    base_ys = [f["flowchartUI"]["y"] for f in base_form["fields"] if "flowchartUI" in f]
    append_ys = [f["flowchartUI"]["y"] for f in append_fields if "flowchartUI" in f]
    if base_ys and append_ys:
        y_offset = max(base_ys) - min(append_ys) + 500
        for f in append_fields:
            if "flowchartUI" in f:
                f["flowchartUI"]["y"] += y_offset
        print(f"Canvas Y offset: {y_offset:.0f}")

    merged_fields = base_form["fields"] + append_fields

    merged_form = dict(base_form)
    merged_form["id"] = new_form_id
    merged_form.pop("originalId", None)
    merged_form["title"] = merged_title
    merged_form["fields"] = merged_fields
    merged_form["numFields"] = len(merged_fields)

    output = {
        "exportedAt": "2025-01-01T00:00:00.000Z",
        "organizationId": base_data["organizationId"],
        "organizationName": base_data["organizationName"],
        "version": "1.0",
        "title": os.path.splitext(os.path.basename(output_path))[0],
        "data": {
            "journeys": [],
            "automation_triggers": [],
            "forms": [merged_form],
            "templates": [],
            "calendar_event_templates": [],
            "databases": [],
        },
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written: {output_path}")
    print(f"Form ID: {new_form_id}")
    print(f"Total fields: {len(merged_fields)}")
    print()
    print("IMPORTANT: Delete any previous merged form imports from Tellescope before importing this file.")


if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python merge-two-forms.py <base.json> <append.json> <output.json> <base-last-field-id> <merged-title>")
        sys.exit(1)
    _, base_path, append_path, output_path, base_last_field_id, merged_title = sys.argv
    merge_forms(base_path, append_path, output_path, base_last_field_id, merged_title)
