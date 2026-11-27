# arksets

## Unreleased

- Joined keys commutatively across overlapping delete-only union branches (#1752) and attached basis-derived bound units (`characters`/`items`) with explicit `unit` support during intersection parsing (#1811).
- Fixed 13 set-algebra soundness, cache-poisoning, and tuple-intersection bugs, supported merged morph head-splitting and disjoint morph inputs in `extract`/`exclude` (#1755), and aligned `fromJsonSchema` / `toJsonSchema` draft validation, 2020-12 exclusive bounds, and non-finite `±Infinity` bound handling.

## 0.0.1-beta.1

Initial release: reads arktype Types, Standard JSON Schemas (through the JSON Schema they write) and JSON Schemas as the sets of values they accept, relates them (`isSubset`, `isEqual`, `isDisjoint`), combines them (`intersect`, `union`), finds a union's discriminant and writes JSON Schema. Importing it installs the algebra `@ark/schema` reduces and discriminates with. See the [README](./README.md).
