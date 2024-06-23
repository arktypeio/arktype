# @arktype/attest

## 0.8.1

### Patch Changes

- [#1024](https://github.com/arktypeio/arktype/pull/1024) [`5284b60`](https://github.com/arktypeio/arktype/commit/5284b6054209ffa38f02ae010c3e9ab3dff93653) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - ### Add .satisfies as an attest assertion to compare the value to an ArkType definition.

  ```ts
  attest({ foo: "bar" }).satisfies({ foo: "string" })

  // Error: foo must be a number (was string)
  attest({ foo: "bar" }).satisfies({ foo: "number" })
  ```

- Updated dependencies [[`1bf2066`](https://github.com/arktypeio/arktype/commit/1bf2066800ce65edc918a24c251ce20f1ccf29f4)]:
  - @arktype/util@0.0.50
  - arktype@2.0.0-dev.25

## 0.8.0

### Minor Changes

- [#1011](https://github.com/arktypeio/arktype/pull/1011) [`2be4f5b`](https://github.com/arktypeio/arktype/commit/2be4f5b391d57ad47dc6f4c0e4c9d31ae6b550c5) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - ### Throw by default when attest.instantiations() exceeds the specified benchPercentThreshold

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

### Patch Changes

- Updated dependencies [[`2be4f5b`](https://github.com/arktypeio/arktype/commit/2be4f5b391d57ad47dc6f4c0e4c9d31ae6b550c5)]:
  - @arktype/util@0.0.49
  - arktype@2.0.0-dev.24

## 0.7.10

### Patch Changes

- Updated dependencies [[`232fc42`](https://github.com/arktypeio/arktype/commit/232fc42af18e8412d0095293926077a9c50abdc6)]:
  - @arktype/util@0.0.48
  - arktype@2.0.0-dev.20

## 0.7.9

### Patch Changes

- Updated dependencies [[`317f012`](https://github.com/arktypeio/arktype/commit/317f0122b1f2c0ba6e1de872f210490af75761af)]:
  - @arktype/util@0.0.47
  - arktype@2.0.0-dev.19

## 0.7.8

### Patch Changes

- Updated dependencies [[`ebe3408`](https://github.com/arktypeio/arktype/commit/ebe3408e2310bc8f69eacd29e0d51c99c24d9471)]:
  - @arktype/util@0.0.46
  - arktype@2.0.0-dev.17

## 0.7.7

### Patch Changes

- Updated dependencies [[`79c2b27`](https://github.com/arktypeio/arktype/commit/79c2b276c3645ea51e7bae8fe4463f2f39ddabc8)]:
  - @arktype/util@0.0.45
  - arktype@2.0.0-dev.15

## 0.7.6

### Patch Changes

- [`8cd0807`](https://github.com/arktypeio/arktype/commit/8cd080783fdbd8eefea54d5c04d99cd88b36c0eb) - Initial changeset

- Updated dependencies [[`8cd0807`](https://github.com/arktypeio/arktype/commit/8cd080783fdbd8eefea54d5c04d99cd88b36c0eb)]:
  - @arktype/fs@0.0.20
  - @arktype/util@0.0.44
  - arktype@2.0.0-dev.14
