# PR 46 Bun compatibility correction

The failed PR run 41332372618 pinned Bun 1.3.1, which cannot parse the committed
bun.lock version 2. All three workflow Bun versions and the workflow generator
now select 1.4.4, verified against the official oven-sh/bun GitHub release and
installed local executable.

A fresh copy of the current tracked frontend under infra/validation/pr46/frontend
passed frozen installation, typecheck, lint, its existing unit test, and Next.js
production build using Bun 1.4.4. No frontend files or lockfiles were rewritten.
This is local validation; the updated workflows have not run on GitHub.

Security policy and Container security failed on completed vulnerability findings.
Their policy remains unchanged. Remediation requires explicit authorization to
update application dependencies under the prior master directive's read-only
restriction. Scanner fixed-version suggestions alone are not compatibility proof;
framework/dependency upgrades need targeted tests and fresh full scans. No claim
is made that either security job is resolved.
