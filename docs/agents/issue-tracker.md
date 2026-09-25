# Issue tracker: GitHub

Use `gh` for specs and tickets in `nescls/bookstore-inventory-api`.
Run commands from the repository and verify its origin remote before mutations.

- Read: `gh issue view <number> --comments`.
- List: `gh issue list --state open`.
- Publish: `gh issue create --title "..." --body-file <file>`.
- Update: `gh issue edit <number> --body-file <file>`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply labels: `gh issue edit <number> --add-label ready-for-agent`.

For multi-line content, write the exact body to a file and use `--body-file`.
Create the `ready-for-agent` label if absent when publishing approved work.
Publish the spec and each approved ticket as separate issues. Reference the
parent spec in each ticket and leave the parent open until completion is verified.

Use native GitHub issue blocking relationships where available. These use the
blocker’s database ID, not its issue number. Otherwise record explicit
`Blocked by: #...` references. Work only on tickets whose blockers are complete.

PRs as a request surface: no.
