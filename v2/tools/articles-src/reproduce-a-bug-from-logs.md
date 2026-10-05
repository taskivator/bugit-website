---
title: "Reproduce a bug from a log file: a detective's guide"
slug: reproduce-a-bug-from-logs
summary: "How to find the failing moment in a log, trim it to what matters, turn it into repeatable steps and share it safely."
description: "How to find the failing moment in a log, trim it to what matters, turn it into repeatable steps and share it safely."
hero: images/log-to-repro-steps.svg
hero_alt: "A short example log with the error line highlighted, an arrow, and three numbered steps to reproduce the failure."
product: bugit
canonical: https://bugit.dev/articles/reproduce-a-bug-from-logs/
tags: [reproduce a bug, log analysis, debugging, bug report, QA]
hero_image_idea: "Clean diagram with a short example log on the left with one error line highlighted, an arrow in the middle labelled 'read the clues', and three numbered reproduction steps on the right."
images:
  - file: images/log-to-repro-steps.svg
    placement: "Hero, directly under the title, and reusable as the social card"
    alt: "A short example log with the error line highlighted, an arrow labelled read the clues, and three numbered steps to reproduce the failure."
    kind: diagram
---

# Reproduce a bug from a log file: a detective's guide

A user writes: "It broke. Not sure how." You try the obvious things. Nothing happens. The bug is real, the user is annoyed, and the only witness is a log file with thousands of lines.

Good news: a log is a witness that cannot lie, only mumble. With a little method you can find the moment it went wrong, read the clues around it, and turn them into steps another person can follow. Here is the method.

![An example log with the error line highlighted, an arrow, and three reproduction steps](images/log-to-repro-steps.svg)

## Step one: fix the time of the crime

Start with a time. Ask the reporter when it happened, or use the timestamp on the ticket, and search the log in that window. Look for the first line at warning or error level, not just the loudest one. The first error is often the cause. The errors after it are frequently the program reacting to the damage.

If you have a request id, a session id or a user id, search for it. Following one id through a log turns a wall of text into a single story with a beginning, a middle and an end.

## Step two: read the stack from the top

An exception line tells you the type and the message. The frames below it tell you where the program was standing. Read down until you reach the first frames that belong to your own code, because those name the file and line to look at.

```
12:04:13 ERROR TypeError: plan.period is undefined
    at applyPromo (pricing.ts:88)
    at updateTotal (cart.ts:41)
    at onPromoSubmit (checkout.ts:130)
```

In this example the failure is in `applyPromo`, called from the cart total, called when a promo code is submitted. Already you have a verb for your first step: apply a promo code to a cart.

## Step three: look at what came just before

The lines before the error show the state the program was in. Maybe a setting changed a moment earlier. Maybe a value was loaded from somewhere that did not have it. In the example, the log might show the billing period being switched from monthly to annual a few lines up. That is a clue about the input that led to the failure.

Write down the values you see: the plan name, the code entered, the setting changed, the order of the actions. Order matters. A bug that needs A and then B will not show up if you do B and then A.

## Step four: turn the clues into steps

Now you have enough to write something a person can follow.

1. Write the user actions in the order the log shows them.
2. Swap anything specific to one person for a stand in a tester can reuse, such as a test account.
3. Keep the values that look relevant, such as the promo code and the plan. Drop the rest.
4. Run the steps. If the same error appears, you have a reproduction. If it does not, change one thing at a time: the build, the account type, the data, the order.

Changing one thing at a time is the part that feels slow and is actually fast. Change three things and a success tells you nothing.

## Step five: count how often it happens

Run the steps a few times and note the result. A failure that appears each time points to a logic fault. A failure that shows up now and then often points to timing, load, or data that differs between runs. Put the frequency in the report, because it changes where a developer begins.

## Step six: trim the log before you share it

A log you attach to a ticket is read by more people than you expect, and it can hold things that do not belong in a tracker.

- **Keep the useful part.** The error line, the stack and a few lines before it. Say where the excerpt comes from in the file.
- **Mask personal data.** Email addresses, names and anything that identifies a person.
- **Mask secrets.** Access tokens, API keys and passwords. A token in a ticket can be read by anyone who can open the ticket.
- **Check by eye.** Automated masking helps, but it is a best effort, so look at the result before you attach it.

## What goes in the ticket

State the steps you found, what you expected, what happened, the build, and the frequency, and attach the trimmed excerpt. A developer who reads that can repeat the problem in minutes instead of hours. If you want a shape to follow, the [bug report template](https://bugit.dev/articles/bug-report-template-developers-read/) walks through each part.

## Where BugIt fits

Reading logs is a skill worth having, and it is also a chore when the log is long. When you paste a log into BugIt, it keeps the error line and the stack that matter and leaves out the noise around them, then uses what it found to write the steps and the environment into the draft. BugIt redacts common personal data, which is a best effort, so you read the draft before it is filed. You review every draft, and nothing is written to your tracker until you type FILE IT.

Learn more at [bugit.dev](https://bugit.dev/) and [taskivator.com/bugit](https://taskivator.com/bugit/).

## The takeaway

Find the first error, read the stack from the top, look at what came just before, and write the steps in the order the log shows them. Change one thing at a time when the bug will not repeat, record how often it happens, and trim and mask the log before you share it. A log is a patient witness. Ask it the right questions and it will tell you how to repeat the problem.
