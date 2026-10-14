# arksets

Set algebra for schemas in any format. arksets reads an arktype Type, a Standard JSON Schema (zod, valibot, ...) or a JSON Schema as the set of values it accepts, relates and combines those sets with arktype's algebra, and writes them back out as JSON Schema.

```ts
import { isSubset, isEqual, isDisjoint, intersect, toJsonSchema } from "arksets"
import { type } from "arktype"
import { z } from "zod"

const User = type({ name: "string", age: "number.integer >= 0" })
const ZodUser = z.object({ name: z.string(), age: z.number() })

isSubset(User.toJsonSchema(), ZodUser) // true
isSubset(ZodUser, User) // false: zod allows an age of -1.5
isSubset(User, ZodUser) // false: an arktype object can be an array, a JSON Schema object can't

isDisjoint({ type: "string" }, { type: "array" }) // true
intersect({ type: "string" }, { maxLength: 3 }).expression // "string <= 3"
toJsonSchema(ZodUser) // { type: "object", properties: { ... }, required: ["age", "name"] }
```

Relations are sound: `true` is a proof, and `false` means it couldn't be proven, e.g. through `not` or `uniqueItems`.

## API

Every argument is a `Schema`: a Root (an `@ark/schema` node, which every arktype Type is), a Standard JSON Schema, or a JSON Schema object or boolean.

| function                      | returns                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `parse(schema, options?)`     | the Root of the values `schema` accepts                           |
| `isSubset(l, r)`              | whether every value `l` accepts, `r` accepts                      |
| `isEqual(l, r)`               | whether `l` and `r` accept the same values                        |
| `isDisjoint(l, r)`            | whether no value is accepted by both                              |
| `intersect(...schemas)`       | a Root of what every schema accepts (`never` if they're disjoint) |
| `union(...schemas)`           | a Root of what any schema accepts, without subsumed branches      |
| `discriminate(schema)`        | how a union's branches are told apart, or `null`                  |
| `toJsonSchema(schema, opts?)` | the JSON Schema of `schema`                                       |

Roots validate (`root(data)`, `root.allows(data)`), print (`root.expression`) and can be passed back in. Reads are cached per schema.

`parse` reads a schema's input by default, or its output with `{ io: "out" }`. A JSON Schema's `#/...` refs resolve against the schema itself, or against `{ root: document }`, e.g. an OpenAPI document.

```ts
discriminate({
	type: "object",
	anyOf: [
		{ properties: { kind: { const: "a" } }, required: ["kind"] },
		{ properties: { kind: { const: "b" } }, required: ["kind"] }
	]
})
// { path: ["kind"], kind: "unit", cases: [{ value: "a", branches }, { value: "b", branches }], default: null }
```

## JSON Schema

A Root read from a JSON Schema accepts exactly what a 2020-12 validator accepts, with ajv as the tiebreaker. Every keyword applies, and a type's keywords constrain only that type, so `{ minimum: 5 }` accepts `"foo"`. draft-07 forms (`items` arrays, `additionalItems`, `definitions`, `dependencies`) are read too, and a `$schema` of draft-07 or earlier ignores a `$ref`'s siblings.

- `format` is an annotation, as the spec defaults to. arktype writes a `pattern` beside each format, so its JSON Schema reads back equal.
- Lengths count UTF-16 code units, as arktype's bounds do, where JSON Schema counts code points.
- A `$ref` that isn't a JSON Pointer into its document, `$dynamicRef`, `unevaluatedProperties` and `unevaluatedItems` throw with their JSON Pointer, as does a keyword whose value is invalid.

## The engine

Importing `arksets` also installs the algebra `@ark/schema` uses to reduce nodes and discriminate unions as they're parsed, and to implement relational methods like `.and()`, `.extends()` and `.keyof()`, and `.toJsonSchema()`. arktype installs it from `arksets/internal`, so arksets' public API stays out of arktype's bundle.

Without it, `@ark/schema` parses and validates unreduced nodes and undiscriminated unions, and relational methods and `.toJsonSchema()` throw. Parsing a schema whose validation depends on reduction throws as well: a tuple that bounds its length, an unordered union with a transforming branch, an optional prop under `exactOptionalPropertyTypes: false`, or an index signature keyed by anything other than `string`, `symbol` or `string | symbol`.
