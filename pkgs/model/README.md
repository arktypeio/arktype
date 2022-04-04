<div align="center">
<!-- https://raw.githubusercontent.com/re-do/re-po/main/pkgs/docs/static/img/logo.svg -->
  <img src="../docs/static/img/logo.svg" height="64px" />
  <h1>@re-/model</h1>
</div>
<div align="center">

Type-first validation from editor to runtime🪢

![Coverage: 98%](https://img.shields.io/badge/Coverage-98%25-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code-of-conduct.md)

</div>

## What's a model? 🤷

A model is a way to create universal types for your JS/TS values. From one definition, you get all the benefits of [TypeScript](https://github.com/microsoft/TypeScript) in your editor and build and a validator like [Yup](https://github.com/jquense/yup) or [JOI](https://github.com/sideway/joi) at runtime.

## Installation 📦

`npm install @re-/model`

(feel free to substitute `yarn`, `pnpm`, et al.)

If you're using TypeScript, you'll need at least `4.4`.

## Start quick ⏱️

This snippet will give you an idea of `@re-/model` syntax, but the best way to get a feel for it is in a live editor. Try messing around with the `user` definition in [our demo](https://TODO:updatelink) or paste it in your own editor and see how the type hints help guide you in the right direction.

```ts
import { create } from "@re-/model"

// Most common TypeScript expressions just work...
const user = create({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

// If you're using TypeScript, you can create your type...
type User = typeof user.type

// But a model can also validate your data at runtime...
const { error } = user.validate({
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    browser: "Internet Explorer" // :(
})

// Output: "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
console.log(error ?? "All good!")
```

## Types that clique 🔗

Working with types that refer to one another or themselves? So can your models!

[Just compile a **space**.](https://TODO:updatelink)

```ts
const space = compile({
    user: {
        name: "string",
        bestFriend: "user?",
        groups: "group[]"
    },
    group: {
        title: "string",
        members: "user[]"
    }
})

// Even recursive and cyclic types are precisely inferred
type User = typeof space.types.user

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
space.models.user.assert({
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
})
```

## Definitions that split ✂️

Like keeping your files small and tidy? Perhaps you'd prefer to split your definitions up.

[Try a **declaration**.](https://TODO:updatelink)

`index.ts`

```ts
import { declare } from "@re-/model"

// Declare the models you will define
const { define, compile } = declare("user", "group")

import { userDef } from "./user"
import { groupDef } from "./group"

// Creates your space (or tells you which definition you forgot to include)
const space = compile({ ...userDef, ...groupDef })
```

`user.ts`

```ts
import { define } from "./index"

export const userDef = define.user({
    name: "string",
    friends: "user[]",
    // Type Hint: "Unable to determine the type of 'grop'"
    groups: "grop[]"
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

## Validation that fits 🧩

TypeScript can do a lot, but sometimes things you care about at runtime shouldn't affect your type.

[**Constraints** have you covered.](https://TODO:updatelink)

```ts
const employee = create({
    // Not a fan of regex? Don't worry, 'email' is a builtin type :)
    email: `/[a-z]*@redo\.dev/`,
    about: {
        // Single or double bound numeric types
        age: "18<=integer<125",
        // Or string lengths
        bio: "string<=160"
    }
})

// Subtypes like 'email' and 'integer' become 'string' and 'number'
type Employee = typeof employee.type

// The error messages are so nice you might be tempted to break your code more often ;)
const { error } = employee.validate({
    email: "david@redo.biz",
    about: {
        age: 17,
        bio: "I am very interesting.".repeat(10)
    }
})

// Output: "Encountered errors at the following paths:
// {
//   email: ''david@redo.biz' is not assignable to /[a-z]*@redo.dev/.',
//   about/age: '17 was less than 18.',
//   about/bio: ''I am very interesting.I am very interesting.I am... was greater than 160 characters.'
// }"
console.log(error ?? "Flawless. Obviously.")
```

## Syntax

`@re-/model` supports all of TypeScript's built-in types and a lot of its most common type definition syntax. The following sections outline the kinds of definitions you can use in your models.

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
-   Aliases like `"user"` or `"group"` that have been defined in your space
-   Expressions consisting of one or more string definitions modified by an operator, like `"user | number"` or `"group[]?"`

#### Keywords

All TypeScript keywords that can be used to represent a type are valid definitions. Each of the following string definitions maps directly to its corresponding TS type:

| Keyword       | Notes                                               |
| ------------- | --------------------------------------------------- |
| `"any"`       |                                                     |
| `"unknown"`   | Behaves like `any` when used in validation.         |
| `"never"`     | Will always throw an error when used in validation. |
| `"undefined"` |                                                     |
| `"void"`      | Behaves like `undefined` when used in validation    |
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

Literals are used to specify a `string`, `number`, or `bigint` type constrained to an exact value.

| Literal | Syntax                            | Examples                             | Notes                                                                                                                                           |
| ------- | --------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| string  | `"'T'"` or `'"T"'`                | `"'redo'"` or `'"WithDoubleQuotes"'` | Spaces are not currently supported and will be ignored.                                                                                         |
| number  | `"T"`, where T is a numeric value | `"5"` or `"-7.3"`                    | Though validation checks for the literal's exact value, TypeScript widens its type to `number`. To avoid this behavior, use a number primitive. |
| bigint  | `"Tn"`, where T is an integer     | `"0n"` or `"-999n"`                  | Though validation checks for the literal's exact value, TypeScript widens its type to `bigint`. To avoid this behavior, use a bigint primitive. |

While `boolean` values could also be considered literals, they are modeled as keywords since, unlike other literal types, they can can be defined as a finite set (i.e. `true` and `false`).

#### Expressions

Expressions are a set of syntactic patterns that can be applied to one or more nested string definitions to modify the type they represent. Unless otherwise noted, expressions can be applied to any valid string definition, including other expressions.

The following table is ordered by relative precedence in the event that a definition matches multiple patterns. For example, the definition `"string|boolean[]"` would be interpreted as either a `string` or a list of `boolean` since "Or" applies before "List." Parenthetical grouping is not yet supported, but can be emulated by adding the desired grouping to a space and referencing its alias.

| Exrpession     | Pattern           | Examples                                         | Notes                                                                                                         |
| -------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Optional       | `T?`              | `function?` <br/>`boolean[]?`                    | Adds `undefined` as a possible value. When used in an Object type, also makes the corresponding key optional. |
| Arrow Function | `(T1,T2,...)=>T3` | `(string,boolean[])=>void` <br/>`()=>object`     | At runtime, falls back to validating that a value is of type `function`.                                      |
| Union          | `T1\|T2\|T3\|...` | `false\|string` <br/>`string\|number\|boolean[]` | Acts just like TypeScript's union operator (`\|`)                                                             |
| List           | `T[]`             | `string[]` <br/>`number[][]`                     |                                                                                                               |

Spaces are ignored when parsing expressions, so feel free to use whatever format you find most readable.

### Primitives

Any definition that is neither a string nor an object is considered a primitive and models a type that allows only its exact value. All primitive definitions correspond to an equivalent string definition, so whether you use them often comes down to stylistic preference, though there are some noted circumstances in which they allow TypeScript to infer narrower types than their string equivalents.

| Definition Type | Examples             | Notes                                                                                                                                                |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| undefined       | `undefined`          | Requires compiler option `"strictNullChecks"` or `"strict"` set to `true` in your `tsconfig.json`.                                                   |
| null            | `null`               | Requires compiler option `"strictNullChecks"` or `"strict"` set to `true` in your `tsconfig.json`.                                                   |
| boolean         | `true` <br/> `false` |                                                                                                                                                      |
| number          | `0` <br/> `32.33`    | TS infers the exact value of `number` primitives, while string literals are always widened to `number`.                                              |
| bigint          | `99n` <br/> `-100n`  | TS infers the exact value of `bigint` primitives, while string literals are always widened to `bigint`. <br/> Requires a target of ES2020 or higher. |

## Contributing

If you're interested in contributing to `@re-/model`...

1. Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your experience.
2. Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo

`@re-/model` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
