<div align="center">
  <img src="../../redo.dev/static/img/logo.svg" height="64px" />
  <h1>@re-/model</h1>
</div>
<div align="center">

Type-first validation from editor to runtime🧬

![Coverage: 98%](https://img.shields.io/badge/Coverage-98%25-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code-of-conduct.md)

</div>

## What's a model? 🤷

A model is a way to create universal types for your JS/TS values. From one definition, you get all the benefits of TypeScript in your editor and build and a validator like Yup or JOI at runtime.

## Installation 📦

`npm install @re-/model`

(feel free to substitute `yarn`, `pnpm`, et al.)

If you're using TypeScript, you'll need at least `4.4`.

## Getting Started

Modify any of these examples in our live editor to see the types and validation results change in realtime.

### Your first model (⏱️30s)

[Try it out.](https://redo.dev/model/intro#start-quick-%EF%B8%8F)

```ts @snipFrom:docs/snippets/model.ts
import { model } from "@re-/model"

// Models look just like types...
export const user = model({
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null",
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    }
})

// And can be used just like types...
export type User = typeof user.type
export type EquivalentType = {
    age: number
    browser: "chrome" | "firefox" | "other" | null
    name: {
        first: string
        middle?: string
        last: string
    }
}

// But while types are confined to your IDE...
export const fetchUser = () => {
    return {
        name: {
            first: "Dan",
            last: "Ambramov"
        },
        age: 29,
        browser: "Internet Explorer" // R.I.P.
    }
}

// Models can validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
export const { error, data } = user.validate(fetchUser())

if (error) {
    // "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
    console.log(error.message)
}

// Try changing "user" or "fetchUser" and see what happens!
```

### Spaces

[Try it out.](https://redo.dev/model/spaces)

```ts @snipFrom:docs/snippets/space.ts
import { space } from "@re-/model"

// Spaces are collections of models that can reference each other.
export const redo = space({
    package: {
        name: "string",
        version: "string",
        dependencies: "package[]",
        contributors: "contributor[]"
    },
    contributor: {
        name: "string",
        isInternal: "boolean",
        packages: "package[]"
    }
})

// Recursive and cyclic types are inferred to arbitrary depth.
export type Package = typeof redo.types.package

export const readPackageData = () => {
    return {
        name: "@re-/model",
        version: "latest",
        dependencies: [
            {
                name: "@re-/tools",
                version: 2.2,
                dependencies: []
            }
        ],
        contributors: [
            {
                name: "David Blass",
                isInternal: true
            }
        ]
    }
}

export const getValidatedPackageData = () => {
    const packageDataFromFile = readPackageData()
    // Throws: `Error: Encountered errors at the following paths:
    //    dependencies/0/version: 2.2 is not assignable to string.
    //    dependencies/0/contributors: Required value of type contributor[] was missing.
    //    contributors/0/packages: Required value of type package[] was missing.`
    const validatedPackageData = redo.models.package.assert(packageDataFromFile)
    return validatedPackageData
}
```

### Definitions that split ✂️

Like keeping your files small and tidy? Perhaps you'd prefer to split your definitions up.

[Try it out.](https://redo.dev/model/declarations)

`index.ts`

```ts @snipFrom:docs/snippets/declaration/declaration.ts
import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { groupDef } from "./group.js"
import { userDef } from "./user.js"

// Creates your space (or tells you which definition you forgot to include)
export const mySpace = compile({ ...userDef, ...groupDef })
```

`user.ts`

```ts @snipFrom:docs/snippets/declaration/user.ts
import { define } from "./declaration.js"

export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
```

`group.ts`

```ts @snipFrom:docs/snippets/declaration/group.ts
import { define } from "./declaration.js"

export const groupDef = define.group({
    title: "string",
    members: "user[]"
})
```

### Validation that fits 🧩

TypeScript can do a lot, but sometimes things you care about at runtime shouldn't affect your type.

[**Constraints** have you covered.](https://redo.dev/model/constraints)

```ts @snipFrom:docs/snippets/constraints.ts
import { model } from "@re-/model"

export const employee = model({
    // Not a fan of regex? Don't worry, 'email' is a builtin type :)
    email: `/[a-z]*@redo.dev/`,
    about: {
        // Single or double bound numeric types
        age: "18<=integer<125",
        // Or string lengths
        bio: "string<=80"
    }
})

// Subtypes like 'email' and 'integer' become 'string' and 'number'
type Employee = typeof employee.type

// The error messages are so nice you might be tempted to break your code more often ;)
export const { error } = employee.validate({
    email: "david@redo.biz",
    about: {
        age: 17,
        bio: "I am very interesting.".repeat(5)
    }
})

// Output: "Encountered errors at the following paths:
// {
//   email: ''david@redo.biz' is not assignable to /[a-z]*@redo.dev/.',
//   about/age: '17 was less than 18.',
//   about/bio: ''I am very interesting.I am very interesting.I am... was greater than 80 characters.'
// }"
console.log(error.message ?? "Flawless. Obviously.")
```

## Syntax

`@re-/model` supports many of TypeScript's built-in types and operators, as well as some new ones dedicated exclusively to runtime validation. The following sections outline the kinds of definitions available to you when creating a model.

If there's a type or expression you wish were supported but isn't, we'd love for you to [create a feature request!](https://github.com/re-do/re-po/issues/new) Our parser is easy to extend, so you might just see it an upcoming release 🎁

### Objects

Object definitions are sets of keys or indices corresponding to string, literal, or nested object definitions.

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
-   Expressions consisting of one or more string definitions modified by an operator, like `"user|number"` or `"group[]"`

The entire definition may also include at most one of each modifier, a special category for operators like '?' that are only allowed at the root of a string definition.

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

##### String subtypes

The type of these definitions will be inferred as `string`, but they will validate that the criterion corresponding to their keyword.

| Keyword          | String is valid if it...                                         |
| ---------------- | ---------------------------------------------------------------- |
| `"email"`        | Matches the pattern /^(.+)@(.+)\.(.+)$/.                         |
| `"alpha"`        | Includes exclusively lowercase and/or uppercase letters.         |
| `"alphanumeric"` | Includes exclusively digits, lowercase and/or uppercase letters. |
| `"lowercase"`    | Does not contain uppercase letters.                              |
| `"uppercase"`    | Does not contain lowercase letters.                              |
| `"character"`    | Is of length 1.                                                  |

##### Number subtypes

The type of these definitions will be inferred as `number`, but they will validate that the criterion corresponding to their keyword.

| Keyword         | Number is valid if it...       |
| --------------- | ------------------------------ |
| `"integer"`     | Is an integer.                 |
| `"positive"`    | Is greater than 0.             |
| `"nonnegative"` | Is greater than or equal to 0. |

#### Literals

Literals are used to specify a `string`, `number`, or `bigint` type constrained to an exact value.

| Literal | Syntax                            | Examples                             | Notes                                                                                                                                                                                                                 |
| ------- | --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| string  | `"'T'"` or `'"T"'`                | `"'redo'"` or `'"WithDoubleQuotes"'` | As of now, literals containing the quote character that encloses them are not supported. Support for an escape character is tracked [here](https://github.com/re-do/re-po/issues/346).                                |
| regex   | `/T/`                             | `"/[a-z]*@redo\.dev/"`               | Validation checks whether a string matching the expression. Type is always inferred as `string`. Lack of an escape character for regex containing `"/"` is tracked [here](https://github.com/re-do/re-po/issues/346). |
| number  | `"T"`, where T is a numeric value | `"5"` or `"-7.3"`                    | Though validation checks for the literal's exact value, TypeScript widens its type to `number`. To avoid this behavior, use a number literal.                                                                         |
| bigint  | `"Tn"`, where T is an integer     | `"0n"` or `"-999n"`                  | Though validation checks for the literal's exact value, TypeScript widens its type to `bigint`. To avoid this behavior, use a bigint literal.                                                                         |

While `boolean` values could also be considered literals, they are modeled as keywords since, unlike other literal types, they can can be defined as a finite set (i.e. `true` and `false`).

#### Expressions

Expressions are a set of syntactic patterns that can be applied to one or more nested string definitions to modify the type they represent. Unless otherwise noted, expressions can be applied to any valid string definition, including other expressions.

The following table is ordered by relative precedence in the event that a definition matches multiple patterns. For example, the definition `"string|boolean[]"` would be interpreted as either a `string` or a list of `boolean` since "Or" applies before "List." Arbitrary parenthetical grouping is not yet supported, but can be emulated by adding the desired grouping to a space and referencing its alias.

| Expression     | Pattern            | Examples                                     | Notes                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arrow Function | `(T1,T2,...)=>T3`  | `(string,boolean[])=>void` <br/>`()=>object` | At runtime, falls back to validating that a value is of type `function`.                                                                                                                                                                                                                                                                                                                   |
| Union          | `T1\|T2`           | `false\|string`                              | Acts just like TypeScript's union operator (`\|`). Think of it like a logical "or."                                                                                                                                                                                                                                                                                                        |
| Intersection   | `T1&T2`            | `positive&integer`                           | Acts just like TypeScript's intersection operator (`&`). Think of it like a logical "and."                                                                                                                                                                                                                                                                                                 |
| Constraint     | `T<N` OR `N1<T<N2` | `number<=100` <br/> `5<alphanumeric<20`      | Constraints are number or string keyword singly or doubly bounded by number literals. All comparison operators (<, >, <=, >=) are available. Constraints do not affect the inferred type of the number or string keyword, but will bound the value of a number or the length of a string during validation. Note that for a single-bounded constraint, the keyword must precede its bound. |
| List           | `T[]`              | `string[]` <br/>`number[][]`                 |                                                                                                                                                                                                                                                                                                                                                                                            |

#### Modifiers

Unlike expressions, modifiers are not composable and may only be applied to the root of a string definition. For instance, `"string|number?"` is a valid definition representing an optional string or number, whereas `"string?|number"` is invalid because the `"?"` modifier is only valid if applied after all other non-modifier expressions.

| Exrpession | Pattern | Examples                      | Notes                                                                                                         |
| ---------- | ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Optional   | `T?`    | `function?` <br/>`boolean[]?` | Adds `undefined` as a possible value. When used in an Object type, also makes the corresponding key optional. |

### Primitives

Any definition that is neither a string nor an object is considered a primitive and models a type that allows only its exact value. All primitive definitions correspond to an equivalent string definition, so whether you use them often comes down to stylistic preference, though there are some noted circumstances in which they allow TypeScript to infer narrower types than their string equivalents.

| Definition Type | Examples             | Notes                                                                                                                                                |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| undefined       | `undefined`          | Requires compiler option `"strictNullChecks"` or `"strict"` set to `true` in your `tsconfig.json`.                                                   |
| null            | `null`               | Requires compiler option `"strictNullChecks"` or `"strict"` set to `true` in your `tsconfig.json`.                                                   |
| boolean         | `true` <br/> `false` |                                                                                                                                                      |
| number          | `0` <br/> `32.33`    | TS infers the exact value of `number` primitives, while string literals are always widened to `number`.                                              |
| bigint          | `99n` <br/> `-100n`  | TS infers the exact value of `bigint` primitives, while string literals are always widened to `bigint`. <br/> Requires a target of ES2020 or higher. |

## API

Detailed API docs are coming soon! For now, check out the examples from this README and use the type hints you get to learn how you can customize your models and spaces. If you have any questions, don't hesitate to reach out on the [dedicated Discord channel](https://discord.gg/WSNF3Kc4xh)!

## Contributing

If you're interested in contributing to `@re-/model`...

1.  Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your level of experience.
2.  Check out our [guide](../../CONTRIBUTING.md) to get started!

## About Redo

`@re-/model` is part of a set of devtools designed to help you navigate the JS/TS ecosystem and get back to doing what you love. Learn more [at the root of this repo](https://github.com/re-do/re-po).

## License

This project is licensed under the terms of the
[MIT license](../../LICENSE).
