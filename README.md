<h1 align="center">ArkType <sub><sup>TypeScript's 1:1 validator</sup></sub></h1>

[<img src="./dev/arktype.io/static/img/arktype.gif">](https://arktype.io/try)
<sub>
<i>`typescript@4.9.5` in VS Code— no extensions or plugins required (<a href="#how">how?</a>) (<a href="https://arktype.io/try">try in-browser</a>)</i>
</sub>
<br />

## What is it?

<!-- @snipStart:intro -->

<p>ArkType is a validation library that can infer TypeScript definitions 1:1 and reuse them as highly-optimized validators for your data at runtime.

With each character your type, your editor will show you either:

-   a list of completions
-   a detailed ParseError
-   a type-safe validator

All powered by ArkType's lightning-fast type-level parser- no plugins or dependencies required.</p>

<!-- @snipEnd -->

```ts @blockFrom:dev/test/examples/type.ts
import { type } from "arktype"

// Definitions are statically parsed and inferred as TS.
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Validators return typed data or clear, customizable errors.
export const { data, problems } = user({
    name: "Alan Turing",
    device: {
        // problems.summary: "device/platform must be 'android' or 'ios' (was 'enigma')"
        platform: "enigma"
    }
})
```

[Try it in-browser](https://arktype.io/docs/#your-first-type), or [scroll slightly](#install) to read about installation.

<a id="install" />

<!-- @snipStart:install -->

## Why use it?

-   Performance:
    -   In editor: Types are 3x more efficient than Zod
    -   At runtime: 400x faster than Zod, 2000x faster than Yup
-   Concision:
    -   Definitions: About 1/2 as long as equivalent Zod on average
    -   Types: Tooltips are 1/5 the length of Zod on average
-   Portability: Definitions are just strings and objects and are serializable by default.
-   Developer Experience: With semantic validation and contextual autocomplete, ArkType's static parser is unlike anything you've ever seen.

Also...

-   Deeply-computed intersections
-   Automatically discriminated unions
-   Clear, customizable error messages
-   Recursive and cyclic types that can check cyclic data

## Install <sub><sub>📦`12KB` gzipped, `0` dependencies</sub></sub>

<img src="./dev/arktype.io/static/img/npm.svg" alt="Npm Icon" height="16px" /> <code>npm install arktype</code>
<sub>(or whatever package manager you prefer)</sub>
<br />

Our types are tested in [strict-mode](https://www.typescriptlang.org/tsconfig#strict) with TypeScript versions `4.8`, `4.9`, and `5.0`.

_Our primary APIs have stabilized, but details may still shift during the beta stage of our 1.0 release. If you have suggestions that may require a breaking change, now is the time to let us know!_ ⛵

<!-- @snipEnd -->

### Scopes

[Try this example in-browser.](https://arktype.io/docs/scopes)

```ts @blockFrom:dev/test/examples/scope.ts
import { scope } from "arktype"

// Scopes are collections of types that can reference each other.
export const types = scope({
    package: {
        name: "string",
        "dependencies?": "package[]",
        "contributors?": "contributor[]"
    },
    contributor: {
        // Subtypes like 'email' are inferred like 'string' but provide additional validation at runtime.
        email: "email",
        "packages?": "package[]"
    }
}).compile()

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
const packageData: Package = {
    name: "arktype",
    dependencies: [{ name: "typescript" }],
    contributors: [{ email: "david@sharktypeio" }]
}
packageData.dependencies![0].dependencies = [packageData]

export const { data, problems } = types.package(packageData)
```

<!-- TODO: Examples mapped to here, and on website. On website, most examples would be a code block by deafult but would have a button like the one on the homepage to turn it into a StackBlitz demo. -->

## Integrations

### react-hook-form

### tRPC

ArkType can easily be used with tRPC via the `assert` prop:

```ts
...
t.procedure
  .input(
    type({
      name: "string",
      "age?": "number"
    }).assert
  )
...
```

## How?

ArkType's mirrored static and dynamic parsers means the feedback you get in your IDE is the same as the eventual parse result at runtime.

If you're curious, below is an example of what that looks like under the hood. If not, just close that hood back up, `npm install arktype` and enjoy top-notch developer experience🔥

```ts @blockFrom:src/parse/string/shift/operator/operator.ts:parseOperator
export const parseOperator = (s: DynamicStateWithRoot): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize()
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.setRoot(s.root.toArray())
            : s.error(incompleteArrayTokenMessage)
        : lookahead === "|" || lookahead === "&"
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : isKeyOf(lookahead, comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : throwInternalError(writeUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends StaticState> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
                ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
                : error<incompleteArrayTokenMessage>
            : lookahead extends "|" | "&"
            ? state.reduceBranch<s, lookahead, unscanned>
            : lookahead extends ")"
            ? state.finalizeGroup<s, unscanned>
            : lookahead extends ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<state.scanTo<s, unscanned>>
            : error<writeUnexpectedCharacterMessage<lookahead>>
        : state.finalize<s>
```

## Contributions

We accept and encourage pull requests from outside ArkType.

Depending on your level of familiarity with type systems and TS generics, some parts of the codebase may be hard to jump into. That said, there's plenty of opportunities for more straightforward contributions.

If you're planning on submitting a non-trivial fix or a new feature, please [create an issue first](https://github.com/arktypeio/arktype/issues/new) so everyone's on the same page. The last thing we want is for you to spend time on a submission we're unable to merge. If you're at all in doubt, please reach out on [our Discord](https://discord.gg/WSNF3Kc4xh) to double check!

When you're ready, check out our [guide](./.github/CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the [MIT license](./LICENSE).

## Collaboration

I'd love to hear about what you're working on and how ArkType can help. Please reach out to david@arktype.io.

## Code of Conduct

We will not tolerate any form of disrespect toward members of our community. Please refer to our [Code of Conduct](./.github/CODE_OF_CONDUCT.md) and reach out to david@arktype.io immediately if you've seen or experienced an interaction that may violate these standards.

## Sponsorship

We've been working full-time on this project for over a year and it means a lot to have the community behind us.

If the project has been useful to you and you are in a financial position to do so, please chip in via [GitHub Sponsors](https://github.com/sponsors/arktypeio).

Otherwise, consider sending me an email (david@arktype.io) or [message me on Discord](https://discord.gg/WSNF3Kc4xh) to let me know you're a fan of ArkType. Either would make my day!

### Community

[Discord](https://discord.gg/WSNF3Kc4xh)
[Twitter (ArkType)](https://twitter.com/arktypeio)
[Twitter (ssalbdivad)](https://twitter.com/ssalbdivad)
[Twitch](https://twitch.tv/arktypeio)
[Docs](https://arktype.io)

### Current Sponsors 🥰

| [tmm](https://github.com/tmm)                                             | [xrexy](https://github.com/xrexy)                                          | [thomasballinger](https://github.com/thomasballinger)                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| <img height="64px" src="https://avatars.githubusercontent.com/u/6759464"> | <img height="64px" src="https://avatars.githubusercontent.com/u/71969236"> | <img height="64px" src="https://avatars.githubusercontent.com/u/458879"> |
