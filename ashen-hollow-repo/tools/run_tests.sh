#!/usr/bin/env bash
# Run every suite against src/. They anchor on exact source text, so they must
# run against src/ and not dist/.
set -u
cd "$(dirname "$0")/.."
cp src/ashen_hollow.html work.html
fail=0
for t in tests/t*.js; do
  if ! node "$t" >/dev/null 2>&1; then echo "FAIL $t"; fail=$((fail+1)); fi
done
rm -f work.html
echo "suites: $(ls tests/t*.js | wc -l)   failing: $fail"
exit $fail
