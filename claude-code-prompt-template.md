# Claude Code — Ticket Prompt Templates
> Copy-paste these when starting a Claude Code session. Replace bracketed values.

---

## Starting a New Ticket

```
Read CLAUDE.md.

We are working on [LIN-XXX] — [ticket title].

Requirements:
[paste acceptance criteria from Linear ticket]

Branch off dev. Branch name: feature/LIN-XXX-[short-slug]

Before writing any code:
1. Confirm which of the three core objects this touches
2. Confirm no constitution rules are violated
3. Show me your plan in 3-5 bullet points, then wait for my go-ahead

When done:
- TypeScript must compile clean
- Run lint and fix any issues
- Write at least one test for the core logic
- Open a PR to dev with title: [LIN-XXX] [ticket title]
- Fill in the PR template constitution checklist
```

---

## Starting a Sprint

```
Read CLAUDE.md.

We are starting Sprint [N]. The tickets for this sprint are:

[LIN-XXX] — [title]
[LIN-XXX] — [title]
[LIN-XXX] — [title]

Work through them in order. For each ticket:
- Create a feature branch off dev
- Implement, test, and open a PR
- Wait for my approval before starting the next ticket

Start with [LIN-XXX].
```

---

## Bug Fix

```
Read CLAUDE.md.

Bug: [LIN-XXX] — [description of the bug]

Reproduce steps:
[describe how to reproduce]

Before fixing:
- Identify the root cause and explain it to me
- Confirm the fix does not bypass any constitution rules (especially revocation and audit log)
- Branch: fix/LIN-XXX-[short-slug]
```

---

## Constitution Audit (run periodically)

```
Read CLAUDE.md.

Audit the codebase against the 9 Platform Constitution rules.

For each rule, check:
1. Are there any code paths that could violate it?
2. Are there any missing guards (e.g. requireActiveGrant not called)?
3. Are there any raw S3 URLs anywhere in the codebase?
4. Is the AuditEvent table ever updated or deleted anywhere?

Report findings as a list. Flag severity: CRITICAL / WARNING / INFO.
Do not fix anything yet — report only.
```

---

## Notes
- Always say "wait for my go-ahead" before coding if the ticket touches access control or the audit log
- Claude Code will read CLAUDE.md automatically — no need to repeat the rules
- If Claude Code proposes something that feels off, ask: "Does this comply with constitution rule [N]?"
