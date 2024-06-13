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
