---
title: Scopes
order: 2
---

Scopes are the foundation of ArkType, and one of the most powerful features for users wanting full control over configuration and to make their own keywords available fluidly within string definition syntax.

Here's a quick preview of what that looks like:

```tsx
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
