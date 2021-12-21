<div align="center">
  <img src="../docs/static/img/logo.svg" height="64px" />
  <h1>@re-/model</h1>
</div>
<div align="center">
Beautiful types from IDE to runtime 🧬

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code-of-conduct.md)

</div>

## Installation

`npm install @re-/model`

(feel free to substitute `yarn`, `pnpm`, et al.)

If you're using TypeScript, you'll need:

-   TODO: TsConfig requirements?
-   TODO: At least version 4.4.x?

## Creating your first model

This snippet will give you an idea of `@re-/model` syntax, but the best way to get a feel for it is in a live editor. Try messing around with the `user` model in [our sandbox](https://TODO:updatelink) or paste it in your own editor and see how the type hints help guide you in the right direction.

```ts
import { model } from "@re-/model"

// Most common TypeScript expressions just work...
const user = model({
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

// Will throw: "At path interests, undefined is not assignable to any of string[]|null."
user.validate(fetchUser())
```

TODO: Complex type

## Typespaces

Your models can reference each other or themselves using a **typespace**. [Try it out](https://TODO:updatelink).

```ts
import { typespace } from "@re-/model"

const mySpace = typespace({
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

// Typescript types can be extracted like this
type User = typeof mySpace.user.type

// Will throw: "At path friends/groups/0, 'Type Enjoyers' is not assignable
// to {name: string, description: string, members: user[]}"
mySpace.user.validate({
    name: "Devin Aldai",
    friends: [
        {
            name: "Devin Olnyt",
            friends: [], // :(
            groups: ["Type Enjoyers"]
        }
    ],
    groups: []
})

// Once you've created a typespace, you can use it to create new models
// that reference existing models like "user"
const community = mySpace.model({
    users: "user[]",
    groups: "group[]",
    population: "number"
})
```

## Declarations

If you prefer to split up your typespace definitions across one or more files, you'll want to use a **declaration**. [Try it out](https://TODO:updatelink).

`index.ts`

```ts
import { declaration } from "@re-/model"

// Declare the names in your typespace allows
const declared = declaration("user", "group")

// A declaration's "define" prop can be used anywhere to create
// a definition that allows references to other declared names
export const { define } = declared

import { userDef } from "./user"
import { groupDef } from "./group"

// Type error: "Declared types 'group' were never defined."
const badSpace = declared.typespace(userDef)

// Creates a typespace identical to that of "Creating your first typespace"
const mySpace = declared.typespace(userDef, groupDef)
```

`user.ts`

```ts
import { define } from "./index"

const badUserDef = define.user({
    name: "string",
    friends: "user[]",
    // Type error: "Unable to determine the type of 'grop'"
    groups: "grop[]"
})

export const userDef = define.user({
    name: "string",
    friends: "user[]",
    groups: "group[]"
})
```

`group.ts`

```ts
import { define } from "./index"

export const groupDef = define.group({
    name: "string",
    description: "string",
    members: "user[]"
})
```

## Syntax

`@re-/model` supports all of TypeScript's built-in types and a lot of its most common type definition syntax. The following sections summarize the keywords and operators available by default in your definitions.

If the TS syntax you want to use is not listed here, feel free to create an issue summarizing your use case. Our model is easy to extend, so you might just see it an upcoming release 🎁

### Object definitions

Object definitions are objects whose values are leaf definitions and/or nested object definitions.

#### Map

Map definitions are represented using the familiar JS notation for string keys with corresponding values.

```ts
const foo = model({
    key: "string?",
    anotherKey: ["unknown", { re: "'model'|'state'|'test'" }]
})

// Equivalent TS
type FooToo = {
    key?: string
    anotherKey: [
        unknown,
        {
            re: "model" | "state" | "test"
        }
    ]
}
```

#### Tuple

Tuple definitions are useful for fixed-length lists and are represented as expected.

```ts
const bar = model([
    "true|null",
    { coords: ["number", "number"], piOus: [3, 1, 4] }
])

// Equivalent TS
type BarAgain = [
    true | null,
    {
        coords: [number, number]
        piOus: [3, 1, 4]
    }
]
```

### String definitions

Leaf definitions are strings that include one or more type references (i.e. built-ins like "string" or defined types like "user") **and** one or more operators that modify those types. Spaces are ignored when parsing leaf definitions, so feel free to use whatever format you find most readable.

#### Expressions

| Type           | Syntax            | Examples                                         | Notes                                                                                                                                                         |
| -------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrow Function | `(T1,T2,...)=>T3` | `(string,boolean)=>void` <br/>`()=>object`       | At runtime, falls back to validating that a value is of type `function`.                                                                                      |
| List           | `T[]`             | `string[]` <br/>`number[][]`                     |                                                                                                                                                               |
| Optional       | `T?`              | `function?` <br/>`boolean[]?`                    | Adds `undefined` as a possible value. When used in an Object type, also makes the corresponding key optional. Can only occur once at the end of a definition. |
| Or             | `T1\|T2\|T3\|...` | `false\|string` <br/>`string\|number\|boolean[]` | Acts just like TypeScript's union operator (`\|`)                                                                                                             |

## Contributing

If you're interested in contributing to `@re-/model`...

1. Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your experience.
2. Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo

`@re-/model` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
