---
trigger: always_on
---

# Security and Safety Rules

PlacementOS is a personal application.

## File access

- Work only within the active project workspace.
- Do not access unrelated personal files.
- Do not request non-workspace access unless explicitly necessary and approved.

## Secrets

Never hard-code:

- API keys;
- passwords;
- tokens;
- credentials;
- private keys.

Never commit secrets to Git.

Use environment variables when secrets become necessary.

## Data

The application may contain personal study and placement information.

Do not expose personal information unnecessarily.

Validate imported data before storing it.

Do not silently delete user data.

## Destructive actions

Before:

- deleting data;
- resetting the application;
- removing major files;
- changing storage formats;
- performing destructive Git operations;

request explicit approval.

## External services

Do not add external services or APIs without explaining:

- why they are needed;
- what data they receive;
- whether they require an account;
- whether they cost money;
- whether the application can work without them.

## Security over convenience

Do not weaken security or validation merely to make implementation easier.
