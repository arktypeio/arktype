# @arktype/jsonschema

## What is it?
@arktype/jsonschema is a package that allows converting from a JSON Schema schema, to an ArkType type. For example:
```js
import { parseJsonSchema } from "@ark/jsonschema"

const t = parseJsonSchema({type: "string", minLength: 5, maxLength: 10})
```
is equivalent to:
```js
import { type } from "arktype"

const t = type("5<=string<=10")
```
This enables easy adoption of ArkType for people who currently have JSON Schema based runtime validation in their codebase.

Where possible, the library also has TypeScript type inference so that the runtime validation remains typesafe. Extending on the above example, this means that the return type of the below `parseString` function would be  correctly inferred as `string`:
```ts
const assertIsString = (data: unknown)
    return t.assert(data)
```

## Extra Type Safety
If you wish to ensure that your JSON Schema schemas are valid, you can do this too! Simply import the `JsonSchema` namespace type from `@ark/jsonschema`, and use the appropriate member like so:
```ts
import type { JsonSchema } from "@ark/jsonschema"

const schema: JsonSchema.StringSchema = {
    type: "string",
    minLength: "3" // errors stating that 'minLength' must be a number
}
```