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

// But a model can also validate your data at runtime...
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

`@re-/model` supports all of TypeScript's built-in types and a lot of its most common type definition syntax. The following sections outline the definition patterns you can use in your models.

If the TS syntax you want to use is not listed here, feel free to create an issue summarizing your use case. Our model is easy to extend, so you might just see it an upcoming release 🎁

### Objects

Object definitions are sets of keys or indices corresponding to string, primitive, or nested object definitions.

#### Map

Map definitions are represented using the familiar object literal syntax.

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

Tuple definitions are useful for fixed-length lists and are represented as array literals.

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

### Strings

String definitions are strings constructed from the following fragment types:

-   Builtins, including keywords like `"number"` and literals like `"'redo'"`
-   Aliases like `"user"` or `"group"` that have been defined in your typespace
-   Expressions consisting of one or more string definitions modified by an operator, like `"user | number"` or `"group[]?"`

Spaces are ignored when parsing leaf definitions, so feel free to use whatever format you find most readable.

#### Keywords

All TypeScript keywords that can be used to represent a type are valid definitions. Each of the following string definitions maps directly to its corresponding TS type:

| Keyword       | Notes                                               |
| ------------- | --------------------------------------------------- |
| `"any"`       |                                                     |
| `"unknown"`   | Behaves like `any` when used in validation.         |
| `"never"`     | Will always throw an error when used in validation. |
| `"undefined"` |                                                     |
| `"void"`      | Behaves like `undefined` when used in validation.   |
| `"object"`    |                                                     |
| `"null"`      |                                                     |
| `"function"`  |                                                     |
| `"string"`    |                                                     |
| `"number"`    |                                                     |
| `"bigint"`    |                                                     |
| `"boolean"`   |                                                     |
| `"true"`      |                                                     |
| `"false"`     |                                                     |
| `"symbol"`    |                                                     |

#### Literals

Literals are used to constraint a `string`, `number`, or `bigint` type to a specified value.

| Literal | Syntax                            | Examples                             | Notes                                                   |
| ------- | --------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| string  | `"'T'"` or `'"T"'`                | `"'redo'"` or `'"WithDoubleQuotes"'` | Spaces are not currently supported and will be ignored. |
| number  | `"T"`, where T is a numeric value | `"5"` or `"-7.3"`                    |                                                         |
| bigint  | `"Tn"`, where T is an integer     | `"0n"` or `"-999n"`                  |                                                         |

While `boolean` values could also be considered literals, they are modeled as keywords since, unlike other literal types, they can can be defined as a finite set (i.e. `true` and `false`).

#### Expressions

| Exrpession     | Syntax            | Examples                                         | Notes                                                                                                         |
| -------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Arrow Function | `(T1,T2,...)=>T3` | `(string,boolean)=>void` <br/>`()=>object`       | At runtime, falls back to validating that a value is of type `function`.                                      |
| List           | `T[]`             | `string[]` <br/>`number[][]`                     |                                                                                                               |
| Optional       | `T?`              | `function?` <br/>`boolean[]?`                    | Adds `undefined` as a possible value. When used in an Object type, also makes the corresponding key optional. |
| Or             | `T1\|T2\|T3\|...` | `false\|string` <br/>`string\|number\|boolean[]` | Acts just like TypeScript's union operator (`\|`)                                                             |

### Primitives

Any definition that is neither a string nor an object is considered a primitive and models a type that allows only its exact value. All primitive definitions correspond to an equivalent string definition, so whether you use them often comes down to stylistic preference, though there are some noted circumstances in which they allow TypeScript to infer narrower types than their string equivalents.

| Definition Type | Examples             | Notes                                                                                                   |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| undefined       | `undefined`          |                                                                                                         |
| null            | `null`               |                                                                                                         |
| boolean         | `true` <br/> `false` |                                                                                                         |
| number          | `0` <br/> `32.33`    | TS infers the exact value of `number` primitives, while string literals are always widened to `number`. |
| bigint          | `99n` <br/> `-100n`  | TS infers the exact value of `bigint` primitives, while string literals are always widened to `bigint`. |

## Contributing

If you're interested in contributing to `@re-/model`...

1. Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your experience.
2. Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo

`@re-/model` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
