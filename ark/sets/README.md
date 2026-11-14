# arksets

Set algebra for schemas in any format. arksets reads an arktype Type, a Standard JSON Schema (e.g. zod) or a JSON Schema as the set of values it accepts, relates and combines those sets with arktype's algebra, and writes them back out as JSON Schema.

```ts
import { discriminate, intersect, isSubset, toJsonSchema } from "arksets"
import { z } from "zod"

const v1 = z.object({ id: z.string(), age: z.number().int().min(0) })
const v2 = z.object({ id: z.string(), age: z.number().optional() })

// v2 is backwards compatible: it accepts everything v1 did
isSubset(v1, v2) // true
isSubset(v2, v1) // false: v2 accepts { id: "a" }

intersect(v2, { properties: { age: { maximum: 120 } } }).expression // "{ id: string, age?: number <= 120 }"
toJsonSchema(v2) // { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { id: { type: "string" }, age: { type: "number" } }, required: ["id"] }

const Event = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("click"), x: z.number() }),
	z.object({ kind: z.literal("key"), key: z.string() })
])
discriminate(Event) // { path: ["kind"], kind: "unit", cases: [{ value: "key", branches }, { value: "click", branches }], default: null }
```

Relations are sound for what each schema is read as: `true` is a proof, and `false` means it couldn't be proven, e.g. through `not` or `uniqueItems`. A Type is read exactly and a JSON Schema as [below](#json-schema). A Standard JSON Schema is read as the JSON Schema it writes, so what that can't express, like zod's refinements, transforms and `undefined`, is invisible, and `true` proves the relation only for those JSON Schemas: `isSubset(z.string(), z.string().refine(s => s === "x"))` is `true`.

## API

Every argument is a `Schema`: a Root (an `@ark/schema` node, which every arktype Type is), a Standard JSON Schema, or a JSON Schema object or boolean.

A Standard JSON Schema is a schema whose `~standard` has `jsonSchema`, e.g. from zod 4.2.0 or later. Pass any other library's schema as its JSON Schema, e.g. `z.toJSONSchema(schema)` before zod 4.2.0. Anything else throws a `ParseError`, as does a Standard JSON Schema whose `~standard.jsonSchema` throws, like zod's for `z.date()`, with the library's error as its `cause`.

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

Roots validate (`root(data)`, `root.allows(data)`), print (`root.expression`) and can be passed back in. A Standard Schema's read is cached; a JSON Schema is plain data, so it's read on every call.

`parse` reads a schema's input by default, or its output with `{ io: "out" }`. A JSON Schema's `#/...` refs resolve against the schema itself, or against `{ root: document }`, e.g. an OpenAPI document.

## Comparing arktype Types with JSON Schema

An arktype object can also be an array, and a JSON Schema object can't, so an arktype Type is compared by its own semantics. Compare its `.toJsonSchema()` to use JSON's:

```ts
import { isSubset } from "arksets"
import { type } from "arktype"
import { z } from "zod"

const User = type({ name: "string" })
const ZodUser = z.object({ name: z.string() })

isSubset(ZodUser, User) // true
isSubset(User, ZodUser) // false: User allows Object.assign([], { name: "" })
isSubset(User.toJsonSchema(), ZodUser) // true
```

## JSON Schema

A Root read from a JSON Schema accepts exactly what a 2020-12 validator accepts, except that lengths count UTF-16 code units, with ajv as the tiebreaker. Every keyword applies, and a type's keywords constrain only that type, so `{ minimum: 5 }` accepts `"foo"`. draft-07 forms (`items` arrays, `additionalItems`, `definitions`, `dependencies`) are read too, and a `$schema` of draft-07 or earlier ignores a `$ref`'s siblings.

- `format` is an annotation, as the spec defaults to. arktype writes a `pattern` beside each format, so its JSON Schema reads back equal.
- A `pattern` may also be a `RegExp`, read with its own flags.
- Lengths count UTF-16 code units, as arktype's bounds do, where JSON Schema counts code points.
- A `$ref` that isn't a JSON Pointer into its document, `$dynamicRef`, `unevaluatedProperties` and `unevaluatedItems` throw with their JSON Pointer, as does a keyword whose value is invalid.

## The engine

Importing `arksets` also installs the algebra `@ark/schema` uses to reduce nodes and discriminate unions as they're parsed, and to implement `.toJsonSchema()` and relational methods like `.and()`, `.extends()` and `.keyof()`. arktype installs it from `arksets/internal`, so arksets' public API stays out of arktype's bundle.

Without it, `@ark/schema` parses and validates unreduced nodes and undiscriminated unions, and relational methods and `.toJsonSchema()` throw. Parsing a schema whose validation depends on reduction throws as well: a tuple that bounds its length, an unordered union with a transforming branch, an optional prop under `exactOptionalPropertyTypes: false`, or an index signature keyed by anything other than `string`, `symbol` or `string | symbol`.

See [arktype.io/docs/internals/sets](https://arktype.io/docs/internals/sets) for what works without it.
