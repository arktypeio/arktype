<h1 align="center">ArkType</h1>

![](./dev/arktype.io/static/img/arktype.gif)

## Installation 📦

`npm install arktype`

If you're using TypeScript, you'll need at least `4.8`

_Note: Our APIs have largely stabilized at this point, but some may still change during the alpha/beta stages of our 1.0 release. If you have feedback that may require a breaking change, now is the time to let us know!_

### Your first type

[Try it out.](https://arktype.io/docs/#your-first-type)

```ts @blockFrom:dev/examples/type.ts
import { type } from "../../src/main.ts"

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

```ts @blockFrom:dev/examples/scope.ts
import { scope } from "../../src/main.ts"

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

## API

ArkType supports many of TypeScript's built-in types and operators, as well as some new nes dedicated exclusively to runtime validation. In fact, we got a little ahead of ourselves and built a ton of cool features, but we're still working on getting caught up syntax and API docs. Keep an eye out for more in the next couple weeks! In the meantime, check out the examples from this README and use the type hints you get to learn how you can customize your types and scopes. If you have any questions, don't hesitate to reach out on the [dedicated Discord channel](https://discord.gg/WSNF3Kc4xh)!

## Contributing

If you're interested in contributing to ArkType...

1.  Thank you! We'll do everything we can to make this as straightforward as possible, regardless of your level of experience.
2.  Check out our [guide](./CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](./LICENSE).
