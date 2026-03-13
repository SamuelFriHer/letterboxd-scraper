## 2024-03-22 - Improve CLI Form Validation
**Learning:** For a CLI app relying on `readline-sync`, missing inline validations allow users to submit improper formats (e.g., strings for years, negative page numbers) which can fail later in the application flow.
**Action:** Always use `readline-sync`'s built-in `limit` (with array, regex, or callback) and `limitMessage` options to validate inputs at the source and provide immediate, user-friendly feedback.
