# arktype

## 2.1.0

### Builtin keywords can now be globally configured

This can be very helpful for customizing error messages without needing to create your own aliases or wrappers.

```ts title="config.ts"
import { configure } from "arktype/config"

configure({
	keywords: {
		string: "shorthand description",
		"string.email": {
			actual: () => "definitely fake"
		}
	}
})
```

```ts title="app.ts"
import "./config.ts"
import { type } from "arktype"

const user = type({
	name: "string",
	email: "string.email"
})

const out = user({
	// ArkErrors: name must be shorthand description (was a number)
	name: 5,
	// ArkErrors: email must be an email address (was definitely fake)
	email: "449 Canal St"
})
```

The options you can provide here are identical to those used to [configure a Type directly](https://arktype.io/docs/expressions#meta), and can also be [extended at a type-level to include custom metadata](https://arktype.io/docs/configuration#custom).

### Tuple and args expressions for `.to`

If a morph returns an `ArkErrors` instance, validation will fail with that result instead of it being treated as a value. This is especially useful for using other Types as morphs to validate output or chain transformations.

To make this easier, there's a special `to` operator that can pipe to a parsed definition without having to wrap it in `type` to make it a function.

This was added before 2.0, but now it comes with a corresponding operator (`|>`) so that it can be expressed via a tuple or args like most other expressions:

```ts
const fluentStillWorks = type("string.numeric.parse").to("number % 2")

const nowSoDoesTuple = type({
	someKey: ["string.numeric.parse", "|>", "number % 2"]
})

const andSpreadArgs = type("string.numeric.parse", "|>", "number % 2")
```

### Error configurations now accept a string directly

```ts
const customOne = type("1", "@", {
	// previously only a function returning a string was allowed here
	message: "Yikes."
})

// ArkErrors: Yikes.
customOne(2)
```

Keep in mind, [as mentioned in the docs](https://arktype.io/docs/configuration#errors), error configs like `message` can clobber more granular config options like `expected` and `actual` and cannot be included in composite errors e.g. for a union.

Though generally, returning a string based on context is the best option, in situations where you always want the same static message, it's now easier to get that!

### Type.toString() now wraps its syntactic representation in `Type<..>`

Previously, `Type.toString()` just returned `Type.expression`. However, in contexts where the source of a message isn't always a `Type`, it could be confusing:

```ts
// < 2.1.0:  "(was string)"
// >= 2.1.0: "(was Type<string>)"
console.log(`(was ${type.string})`)
```

Hopefully if you interpolate a Type, you'll be less confused by the result from now on!

### Fix an issue causing some discriminated unions to incorrectly reject default cases

```ts
const discriminated = type({
	id: "0",
	k1: "number"
})
	.or({ id: "1", k1: "number" })
	.or({
		name: "string"
	})

// previously, this was rejected as requiring a "k1" key

// will now hit the case discriminated for id: 1,
// but still correctly be allowed via the { name: string } branch
discriminated({ name: "foo", id: 1 }))
```

## 2.0.4

### Fix an issue causing global configs to be overwritten when the primary `"arktype"` entry point is imported:

`config.ts`

```ts
import { configure } from "arktype/config"

configure({ numberAllowsNaN: true })
```

`main.ts`

```ts
import "./config.ts"
import { type } from "arktype"
// now correctly allows NaN
type.number.allows(Number.NaN)
```

Previous versions of the docs mistakenly suggested this was possible in a single file. This is not the case in ESM due to hoisting. See the updated global configuration docs [here](https://arktype.io/docs/expressions#brand).

### Better `ParseError` when attempting to constraint a morph

Previously, attempting to directly constrain a transformed type was not a type error but gave a confusing error at runtime:

```ts
// ParseError: MinLength operand must be a string or an array (was never)
type("string.trim > 2")
```

We've added a type error and improved the runtime error:

```ts
// TypeScript: To constrain the output of string.trim, pipe like myMorph.to('number > 0')
// ParseError: MinLength operand must be a string or an array (was a morph)
type("string.trim > 2")
```

### Fix an issue causing certain complex morph types to not infer output correctly, e.g.:

```ts
const types = type.module({
	From: { a: ["1", "=>", () => 2] },
	Morph: ["From", "=>", e => e],
	To: { a: "2" }
})
const U = types.Morph.pipe(e => e, types.To)

// was:
//    (In: never) => To<{ a: 2 }>
// now fixed to:
//    { a: 2 }
const out = U.assert({ a: 1 })
```

## 2.0.3

- Fix an issue causing some unions with `onUndeclaredKey: "reject"` to reject valid data ([#1266](https://github.com/arktypeio/arktype/issues/1266))

- Fix an issue where Types containing arrays were incorrectly treated as including morphs, leading to some unnecessary validation overhead ([#1268](https://github.com/arktypeio/arktype/issues/1268#issuecomment-2613551907))

- Fix an issue causing objects containing functions like `() => never` that are subtypes of `InferredMorph` to be incorrectly treated as morphs ([#1264](https://github.com/arktypeio/arktype/issues/1264))

- Fail early with a `ParseError` if `instanceOf` operand is not actually a function at runtime ([#1262](https://github.com/arktypeio/arktype/issues/1262))

## 2.0.2

- Fix an issue where type-altering (currently config options `numberAllowsNan`, `dateAllowsInvalid` and `onUndeclaredKey`) could be specified at a scope-level, leading to unintuitive cache results ([#1255](https://github.com/arktypeio/arktype/issues/1255))

## 2.0.1

- Fix `@ark/util` version specifier

## 2.0.0

- Initial stable release 🎉
