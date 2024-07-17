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

Other common utils like `Pick` and `Omit` to follow in the an upcoming release.

Recursive and cyclic generics are also currently unavailable and will be added soon.

For more usage examples, check out the unit tests for generics [here](https://github.com/arktypeio/arktype/blob/main/ark/type/__tests__/generic.test.ts).

This feature was built to be very robust and flexible. We're excited to see what you do with it!
