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

`npm install @re-/type`

If you're using TypeScript, you'll need:

-   TODO: TsConfig requirements?
-   TODO: At least version 4.4.x?

## Creating your first type

This snippet will give you an idea of `@re-/type` syntax, but the best way to get a feel for it is [in a live editor](https://TODO:updatelink). Try messing around with the `user` type and see how the type hints help guide you in the right direction.

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

// If you're using TypeScript, you can create your type...
type User = typeof user.type

// And it will be totally equivalent to...
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

// Throws: "At path interests, undefined is not assignable to any of string[]|null."
user.assert(fetchUser())
```

## Creating your first typeset

Your types can reference each other or themselves using a **typeset**. Try it out.

```ts
import { compile } from "@re-/type"

const typeset = compile({
    user: {
        name: "string",
        friends: "user[]",
        groups: "group[]"
    },
    group: {
        name: "string",
        description: "string",
        members: "user[]"
    }
})

typeset.types.user.type

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

// If you're using TypeScript, you can create your type...
type User = typeof user.type

// And it will be totally equivalent to...
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

// Throws: "At path interests, undefined is not assignable to any of string[]|null."
user.assert(fetchUser())
```

## Contributing

If you're interested in contributing to `@re-/type`...

1. Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your experience.
2. Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo

`@re-/type` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
