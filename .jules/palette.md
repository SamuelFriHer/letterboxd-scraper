# Palette's Journal

## 2024-05-18 - First entry

**Learning:** Documenting critical UX/a11y insights.
**Action:** Keep adding notes here.

## 2024-04-03 - CLI Default Inputs for Reduced Friction

**Learning:** Adding `defaultInput` options to `readline-sync` prompts significantly reduces user friction by allowing them to skip repetitive questions or just press Enter for common paths (e.g., defaulting to 'popular' scraping and '1' page). This makes the CLI feel more like a modern, intuitive application rather than a strict questionnaire.
**Action:** Always provide sensible default inputs for interactive CLI prompts where a clear "happy path" or standard use-case exists. Ensure the visual prompt clearly indicates the default value (e.g., `[popular]`).

## 2026-04-10 - Dynamic Contextual Defaults for CLI Prompts

**Learning:** Hardcoded default values are good, but dynamic contextual defaults (like the current year or decade based on the system date) are even better. They anticipate the user's most likely intent at the exact moment of execution, further reducing friction and making the CLI feel intelligent and responsive.
**Action:** When a "happy path" involves time-sensitive or context-dependent data, compute the default dynamically rather than using a static placeholder, and clearly display it in the prompt (e.g., `[2024]`).

## 2024-05-18 - Auto-formatting CLI Input for Better UX

**Learning:** Forcing users to enter data in strict formats (like a director's URL slug: `paul-thomas-anderson`) causes unnecessary friction and frequent errors.
**Action:** Always accept human-readable input formats (like "Paul Thomas Anderson") and implement auto-formatting/slugification behind the scenes to handle the necessary backend transformations automatically.
