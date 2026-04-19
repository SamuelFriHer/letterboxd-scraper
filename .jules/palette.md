## 2024-05-18 - Instructing Users on Hard-to-Guess Identifiers
**Learning:** Forcing users to guess strict formats (like a director's URL slug: `paul-thomas-anderson`) causes friction. However, auto-slugifying human-readable input is dangerous for edge cases (like `john-ford-2`).
**Action:** When an identifier cannot be reliably determined by backend transformations without an API call, explicitly instruct the user *where* to find the exact identifier (e.g., "the end of their URL") rather than leaving them to guess the format or trying to build fragile auto-formatting logic.
