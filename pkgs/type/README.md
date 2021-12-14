<div align="center">
  <img src="../docs/static/img/logo.svg" height="64px" />
  <h1>@re-/type</h1>
</div>
<div align="center">
Beautiful types from IDE to runtime 🧬

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code-of-conduct.md)
</div>

## Installation
Install the package using your favorite package manager:

```npm install @re-/type```


If you're using TypeScript, you'll need:
- TODO: TsConfig requirements?
- TODO: At least version 4.4.x?

## Creating your first type

```ts
import { parse } from "@re-/type"

// Most common TypeScript expressions just work...
const user = parse({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    interests: "string[]|null"
})

// You can create a TypeScript type in one line...
type User = typeof user.type

// That is totally equivalent to...
type RedundantUserDeclaration = {
    name: {
        first: string
        middle?: string
        last: string
    }
    age: number
    interests: string[] | null
}

// And can also validate your data at runtime...
const fetchUser = () => {
    return {
        name: {
            first: "Reed",
            last: "Doe"
        },
        age: 28,
        interests: undefined
    }
}

// TODO: Throws error...
user.assert(fetchUser())
```

## Contributing

If you're interested in contributing to ```@re-/type```...

1. Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your experience.
2. Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo
```@re-/type``` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
