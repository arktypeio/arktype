# @ark/fast-check

## Unreleased

### Install `@ark/fast-check`, not `@arktype/fast-check`

`@arktype/fast-check`, which published the same package, is no longer published.

### Take `arktype` as a peer dependency

`arktype` was a dependency at an exact version, so an app on any other version installed a second copy. It's now a peer dependency at the version released with it.

### Support fast-check 4

The peer range is now `3 || 4`. fast-check 4 generates invalid Dates by default, which arktype's `Date` rejects, so the `Date` arbitrary passes `noInvalidDate: true`.

### Generate arrays of an exact length

An exact length like `type("string[] == 2")` was ignored, so most generated arrays had the wrong length. It now bounds both ends.

### Generate declared keys alongside an index signature

An object with an index signature, like `type({ "[string]": "number", a: "number" })`, generated only the index signature's entries, so a required key like `a` was always missing. Declared keys are now generated too, each from its value intersected with the value of any index signature that matches it.

Thanks to @lprnmns for #1705.

### Generate cyclic index signatures, like `object.json`

A cyclic Type whose object has only an index signature, like `object.json` or `scope({ tree: { "[string]": "tree | number" } })`, threw fast-check's `Tie has not been initialized`. It now generates.

### Generate cycles through arrays and tuples

A cycle through an array or a tuple, like `scope({ tree: ["number", "tree[]"] })`, threw `Tie has not been initialized` as one through an index signature did. A required cycle with a way out, like `linked: { value: "number", next: "linked | null" }`, generates values that end, and `Infinitely deep cycles are not supported.` is thrown only for a cycle with no finite value.

### Omit every tuple element after an omitted optional one

A variadic element was still generated after an omitted optional one, so `[string, boolean?, ...number[]]` could generate `["a", 1]`, which it rejects.

### Generate only keys every matching index signature allows

An object with several index signatures, like `{ "[string]": "number", "[/^a/]": "0 < number < 10" }`, merged entries each generated for one signature, so a key another signature matched could hold a value that one rejects. Such a key is now kept only where every signature matching it allows its value.

### Generate what `number` and `!=` accept

`number` no longer generates `Infinity` or `-Infinity`, which arktype rejects unless `numberAllowsInfinity` is configured, and a Type constrained with `!=`, like `"0 <= number.integer <= 5 & number != 1"`, generates only values other than its limit.

### Name the class an arbitrary can't be generated for

A class with no builder, like `Map` or `type.instanceOf(Foo)`, threw `buildProtoArbitrary[node.proto.name] is not a function`. It now throws `Foo instances can't be generated`.
