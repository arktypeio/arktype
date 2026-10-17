# @ark/json-schema

## Unreleased

### Read JSON Schema as exactly the values a validator accepts

`jsonSchemaToType` accepts exactly what a 2020-12 validator like ajv accepts, and reads draft-07 forms. Schemas that threw now read, and some that read were wrong:

- `prefixItems` and draft-07 `items` arrays make their elements optional, as JSON Schema does: `[string?, number?, ...unknown[]]`.
- `{ type: "object" }` no longer allows arrays.
- A type's keywords constrain only that type, so `{ minimum: 5 }` allows `"foo"`.
- `minimum` beside `exclusiveMinimum`, `required` without `properties`, and `propertyNames` beside `patternProperties` read rather than throw.
- Composition keywords apply together, where only the first of `allOf`, `anyOf`, `not` and `oneOf` did, and `oneOf` with disjoint branches is a union.
- `$ref` (including recursive refs), `if`/`then`/`else`, `dependentRequired` and `dependentSchemas` are read.

## 0.0.1

### Initial Release

Released the initial implementation of the package.
