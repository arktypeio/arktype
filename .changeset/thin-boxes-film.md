---
"@arktype/attest": minor
---

### Throw by default when attest.instantiations() exceeds the specified benchPercentThreshold

Tests like this will now correctly throw inline instead of return a non-zero exit code:

```ts
it("can snap instantiations", () => {
	type Z = makeComplexType<"asbsdfsaodisfhsda">
	// will throw here as the actual number of instantiations is more
	// than 20% higher than the snapshotted value
	attest.instantiations([1, "instantiations"])
})
```

### Snapshotted completions will now be alphabetized

This will help improve stability, especially for large completion lists like this one which we updated more times than we'd care to admit 😅

```ts
attest(() => type([""])).completions({
	"": [
		"...",
		"===",
		"Array",
		"Date",
		"Error",
		"Function",
		"Map",
		"Promise",
		"Record",
		"RegExp",
		"Set",
		"WeakMap",
		"WeakSet",
		"alpha",
		"alphanumeric",
		"any",
		"bigint",
		"boolean",
		"creditCard",
		"digits",
		"email",
		"false",
		"format",
		"instanceof",
		"integer",
		"ip",
		"keyof",
		"lowercase",
		"never",
		"null",
		"number",
		"object",
		"parse",
		"semver",
		"string",
		"symbol",
		"this",
		"true",
		"undefined",
		"unknown",
		"uppercase",
		"url",
		"uuid",
		"void"
	]
})
```
