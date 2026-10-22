# @ark/fast-check

## Unreleased

### Support fast-check 4

The peer range is now `3 || 4`. fast-check 4 generates invalid Dates by default, which arktype's `Date` rejects, so the `Date` arbitrary passes `noInvalidDate: true`.

### Generate arrays of an exact length

An exact length like `type("string[] == 2")` was ignored, so most generated arrays had the wrong length. It now bounds both ends.

### Generate cyclic index signatures, like `object.json`

A cyclic Type whose object has only an index signature, like `object.json` or `scope({ tree: { "[string]": "tree | number" } })`, threw fast-check's `Tie has not been initialized`. It now generates.

### Name the class an arbitrary can't be generated for

A class with no builder, like `Map` or `type.instanceOf(Foo)`, threw `buildProtoArbitrary[node.proto.name] is not a function`. It now throws `Foo instances can't be generated`.
