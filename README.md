<div align="center">
  <img src="./dev/arktype.io/static/img/logo.svg" height="64px" />
  <h1>ArkType</h1>
</div>
<div align="center">

Isomorphic type syntax for TS/JS

</div>

## Installation 📦

`npm install arktype`

(feel free to substitute `yarn`, `pnpm`, et al.)

If you're using TypeScript, you'll need at least `4.8`.

### Your first type (⏱️30s)

[Try it out.](https://arktype.io/docs/#your-first-type)

```ts @blockFrom:examples/type.ts
import { type } from "arktype"

// Define a type...
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Infer it...
export type User = typeof user.infer

// Validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
export const { data, problems } = user({
    name: "Alan Turing",
    device: {
        platform: "enigma"
    }
})

if (problems) {
    // "device/platform must be 'android' or 'ios' (was 'enigma')"
    console.log(problems.summary)
}
```

### Scopes

[Try it out.](https://arktype.io/docs/scopes)

```ts @blockFrom:examples/scope.ts
import { scope } from "../api.js"

// Scopes are collections of types that can reference each other.
export const types = scope({
    package: {
        name: "string",
        "dependencies?": "package[]",
        "devDependencies?": "package[]",
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
export const readPackageData = () => {
    const packageData: Package = {
        name: "arktype",
        dependencies: [],
        devDependencies: [{ name: "typescript" }],
        contributors: [{ email: "david@sharktypeio" }]
    }
    packageData.devDependencies![0].dependencies = [packageData]
    return packageData
}

// TODO: Update
// `Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@sharktypeio" is not assignable to email.`
export const { problems } = types.package(readPackageData())
```

## API

ArkType supports many of TypeScript's built-in types and operators, as well as some new nes dedicated exclusively to runtime validation. In fact, we got a little ahead of ourselves and built a ton of cool features, but we're still working on getting caught up syntax and API docs. Keep an eye out for more in the next couple weeks! In the meantime, check out the examples from this README and use the type hints you get to learn how you can customize your types and scopes. If you have any questions, don't hesitate to reach out on the [dedicated Discord channel](https://discord.gg/WSNF3Kc4xh)!

## Contributing

If you're interested in contributing to ArkType...

1.  Thank you 😍 We'll do everything we can to make this as straightforward as possible, regardless of your level of experience.
2.  Check out our [guide](./CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](./LICENSE).
