---
title: Generics
sidebar:
  order: 2
---

Native generic syntax is finally available! 🎉

Here are some examples of how this powerful feature can be used:

#### Standalone Type Syntax

```ts
import { type } from "arktype"

const boxOf = type("<t>", { box: "t" })

// hover me!
const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })
```

#### Constrained Parameters

All syntax in parameters definitions and all references to generic args are fully-type safe and autocompleted like any builtin keyword. Constraints can be used just like TS to limit what can be passed to a generic and allow that arg to be used with operators like `>`.

```ts
import { type } from "arktype"

const nonEmpty = type("<arr extends unknown[]>", "arr > 0")

const nonEmptyNumberArray = nonEmpty("number[]")
```

#### Scoped

There is a special syntax for specifying generics in a scope:

```ts
import { scope } from "arktype"

const types = scope({
	"box<t, u>": {
		box: "t | u"
	},
	bitBox: "box<0, 1>"
}).export()

const out = types.bitBox({ box: 0 })
```

#### Builtins

Record is now available as a builtin keyword.

```ts
import { type } from "arktype"

const stringRecord = type("Record<string, string>")
```

In addition to `Record`, the following generics from TS are now available in ArkType:

- **Pick**
- **Omit**
- **Extract**
- **Exclude**

These can be instantiated in one of three ways:

### Syntactic Definition

```ts
import { type } from "arktype"

const one = type("Extract<0 | 1, 1>")
```

### Chained Definition

```ts
import { type } from "arktype"

const user = type({
	name: "string",
	"age?": "number",
	isAdmin: "boolean"
})

// hover me!
const basicUser = user.pick("name", "age")
```

### Invoked Definition

```ts
import { ark } from "arktype"

const unfalse = ark.Exclude("boolean", "false")
```

### TS (TODO)

```ts
import { type, type Type } from "arktype"

const createBox = <T extends string>(of: Type<T>) =>
	type({
		box: of
	})

const boxType = createBox(type("string"))
//    ^?

// @ts-expect-error
const badBox = createBox(type("number"))

console.log(boxType({ box: 5 }).toString())
console.log(boxType({ box: "foo" }))
```

### Generic HKTs

Our new generics have been built using a new method for integrating arbitrary external types as native ArkType generics! This opens up tons of possibilities for external integrations that would otherwise not be possible, but we're still finalizing the API. As a preview, here's what the implementation of `Partial` looks like internally:

```ts
import { generic, Hkt } from "arktype"

const Partial = generic(["T", "object"])(
	args => args.T.partial(),
	class PartialHkt extends Hkt<[object]> {
		declare body: Partial<this[0]>
	}
)
```

More to come on this as the API is finalized!

Recursive and cyclic generics are also currently unavailable and will be added soon.

For more usage examples, check out the unit tests for generics [here](https://github.com/arktypeio/arktype/blob/main/ark/type/__tests__/generic.test.ts).

This feature was built to be very robust and flexible. We're excited to see what you do with it!
