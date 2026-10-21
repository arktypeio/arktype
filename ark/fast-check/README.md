# @ark/fast-check

Generate [fast-check](https://fast-check.dev) arbitraries from ArkType Types, so property-based tests generate data from the definition you validate with.

```sh
npm i -D @ark/fast-check fast-check
```

```ts
import { arkToArbitrary } from "@ark/fast-check"
import { type } from "arktype"
import * as fc from "fast-check"

const User = type({
	name: "string > 0",
	age: "number.integer >= 0"
})

fc.assert(fc.property(arkToArbitrary(User), user => User.allows(user)))
```

See [arktype.io/docs/fast-check](https://arktype.io/docs/fast-check) for what it can generate, what throws and what it ignores.
