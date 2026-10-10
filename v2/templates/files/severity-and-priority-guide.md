# Severity and priority: a guide for bug triage

Severity is how bad the bug is. Priority is how soon it should be fixed. Score them separately.

## Severity

- Critical: data is lost or corrupted, the product will not start, a payment is wrong, or there is a security hole. There is no workaround.
- High: a main feature does not work and the workaround is painful or unknown.
- Medium: a feature misbehaves but a reasonable workaround exists.
- Low: cosmetic issues, small text errors, and anything a user would not notice or mind.

## Priority

- Now: stop other work. Fix and release as soon as it is safe.
- This release: fix before the next release goes out.
- Next: plan it for the following cycle.
- Later: keep it on the list and look again when the list is reviewed.

## Severity and priority together

- High severity, high priority: fix first. Example: password reset emails are not sent.
- High severity, low priority: rare, so ask whether the severity is right. Example: a crash in a feature few people use.
- Low severity, high priority: the case people forget. Example: the company name is misspelled on the home page the day before a launch.
- Low severity, low priority: backlog. Example: a button sits slightly out of line in an older browser.

## Settling a disagreement

1. Does it lose data, money or trust? If yes, treat the severity as high, even when it is rare.
2. How many people hit it, and how often? A bug in a path most people use outranks a bug in a path few people use.
3. Is there a workaround that a user will find without help? If not, move it up.

Write the answer in the ticket so the next person does not reopen the argument.
