# Implementation review

Scope: initial API implementation against specification #1 and approved local-delivery
tickets #2–#8. Deployment #9 is pending the owner's final provider choice.

## Standards

Local review checked the project instructions, domain vocabulary, approved testing
boundaries, and Matt Pocock's code-smell baseline. No outstanding hard standards
violations were found. The shared listing implementation, shared calculation function,
and dictionary are reused; future authorization and scheduling remain explicit TODOs.
Tests primarily exercise HTTP behavior with real PostgreSQL and a controlled provider.
The database update-count probe is the narrow exception explicitly approved in the
spec to verify the single-book-update requirement.

## Spec

Two correctness findings were reproduced with failing tests and fixed:

1. Large monetary values could lose precision with the decimal library's default
   significant-digit setting and JSON-number serialization. Calculations now use
   50-digit arithmetic, reject amounts that cannot round-trip accurately or exceed
   safe integer cents, and leave the book unchanged on failure.
2. Malformed JSON could return 500 because framework exception identity differed
   across module-loading boundaries. The filter now uses the exception's public
   status contract and returns a localized 400 envelope. Internal diagnostic frames
   are logged without copying exception messages, request bodies, or secrets.

The latest rate is ordered by creation time and ID. Live records explicitly capture
insertion time rather than relying on PostgreSQL's transaction-start timestamp.
The seed locks rate initialization against concurrent rate inserts, and book edits
use row locks and a transaction to preserve the cost/price invariant.

## Verification

- Type checking and production compilation passed.
- 20 tests passed: HTTP/PostgreSQL integration plus focused pricing/language tests.
- Docker build/startup, migrations, and real-provider seeding were exercised.
- Local Postman collection: 12 requests and 20 assertions.
- Project dependency audit reported zero vulnerabilities.
- No public deployment or production Postman verification has occurred yet.

## Review limitation

The two review agents requested by the code-review skill could not run because of
an account usage limit. Both review axes were performed locally instead. An independent
agent review is not claimed.
