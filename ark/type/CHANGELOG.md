# arktype

## 2.0.0-dev.15

- Fix a crash when piping to nested paths (see https://github.com/arktypeio/arktype/issues/968)
- Fix inferred input type of `.narrow` (see https://github.com/arktypeio/arktype/issues/969)
- Throw on a pipe between disjoint types, e.g.:

```ts
// Now correctly throws ParseError: Intersection of <3 and >5 results in an unsatisfiable type
const t = type("number>5").pipe(type("number<3"))

// Previously returned a Disjoint object
```

- Mention the actual value when describing an intersection error:

```ts
const evenGreaterThan5 = type({ value: "number%2>5" })
const out = evenGreaterThan5(3)
if (out instanceof type.errors) {
	/*
    value 3 must be...
      • a multiple of 2
      • at most 5
    */
	console.log(out.summary)
}

// was previously "value must be..."
```

Thanks [@TizzySaurus](https://github.com/TizzySaurus) for reporting the last two on [our Discord](arktype.io/discord)!

https://github.com/arktypeio/arktype/pull/971

## 2.0.0-dev.14

### Patch Changes

- Initial changeset

```

```
