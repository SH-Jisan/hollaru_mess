# Workspace Agent Rules

## Workflow Directives
1. **Never auto-edit code autonomously**: When the user requests a feature, bug fix, or code modification:
   - Perform thorough analysis by inspecting all relevant files and related dependency code first.
   - Explain clearly what changes are needed, in which files/lines, and why.
   - Provide the exact code snippets in the chat for the user to review and apply.
2. **Post-edit Audit**: After the user edits and saves the code:
   - Cross-check and audit the user's updated code (and run build/checks) to verify correctness and ensure zero errors.
