---
title: Scopes
sidebar:
  order: 1
---

Scopes are the foundation of ArkType, and one of the most powerful features for users wanting full control over configuration and to make their own keywords available fluidly within string definition syntax.

A scope is just like a scope in code- it's a resolution space where you can define types, generics, etc. `type` is a actually just a method on a Scope!

`Scope` also has a method is called `export`. That method takes all the public names in your scope, and wraps them in an object called a `Module` so you can access them directly.

A lot of the time, if you don't need to create additional types in your scope, you can just `.export()` it right away.

Here's a quick preview of what that looks like:

```ts
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
		email: "string.email",
		"packages?": "package[]"
	}
}).export()

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
const packageData: Package = {
	name: "arktype",
	dependencies: [{ name: "typescript" }],
	contributors: [{ email: "david@sharktypeio" }]
}
packageData.dependencies![0].dependencies = [packageData]

export const out = types.package(packageData)
```
