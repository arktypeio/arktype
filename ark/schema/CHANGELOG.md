# @arktype/schema

## 0.1.12

### Patch Changes

- [#997](https://github.com/arktypeio/arktype/pull/997) [`232fc42`](https://github.com/arktypeio/arktype/commit/232fc42af18e8412d0095293926077a9c50abdc6) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Add a new `parseAsSchema` API that accepts `unknown` and returns either a `ParseError` or a Root schema instance with a castable parameter.

  Useful for stuff like:

  ```ts
  const s = schema("number")
  const fromSerialized = parseAsSchema(s.json)
  ```

- Updated dependencies [[`232fc42`](https://github.com/arktypeio/arktype/commit/232fc42af18e8412d0095293926077a9c50abdc6)]:
  - @arktype/util@0.0.48

## 0.1.11

### Patch Changes

- [#995](https://github.com/arktypeio/arktype/pull/995) [`317f012`](https://github.com/arktypeio/arktype/commit/317f0122b1f2c0ba6e1de872f210490af75761af) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Fixed a cyclic traversal case (see [arktype CHANGELOG](../type/CHANGELOG.md))

- Updated dependencies [[`317f012`](https://github.com/arktypeio/arktype/commit/317f0122b1f2c0ba6e1de872f210490af75761af)]:
  - @arktype/util@0.0.47

## 0.1.10

### Patch Changes

- [#986](https://github.com/arktypeio/arktype/pull/986) [`fbcdddc`](https://github.com/arktypeio/arktype/commit/fbcdddcdd3050c56fef226449c8b9c8fd729521c) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! -

## 0.1.9

### Patch Changes

- [#984](https://github.com/arktypeio/arktype/pull/984) [`ebe3408`](https://github.com/arktypeio/arktype/commit/ebe3408e2310bc8f69eacd29e0d51c99c24d9471) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! -

- Updated dependencies [[`ebe3408`](https://github.com/arktypeio/arktype/commit/ebe3408e2310bc8f69eacd29e0d51c99c24d9471)]:
  - @arktype/util@0.0.46

## 0.1.8

### Patch Changes

- [#974](https://github.com/arktypeio/arktype/pull/974) [`52be860`](https://github.com/arktypeio/arktype/commit/52be860e536db5c4585b7a9f271562e7b2ee9ac3) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Pipe and narrow bug fixes (see [arktype CHANGELOG](../type/CHANGELOG.md))

## 0.1.7

### Patch Changes

- [#971](https://github.com/arktypeio/arktype/pull/971) [`79c2b27`](https://github.com/arktypeio/arktype/commit/79c2b276c3645ea51e7bae8fe4463f2f39ddabc8) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Pipe and narrow bug fixes (see [arktype CHANGELOG](../type/CHANGELOG.md))

- Updated dependencies [[`79c2b27`](https://github.com/arktypeio/arktype/commit/79c2b276c3645ea51e7bae8fe4463f2f39ddabc8)]:
  - @arktype/util@0.0.45

## 0.1.6

### Patch Changes

- [`8cd0807`](https://github.com/arktypeio/arktype/commit/8cd080783fdbd8eefea54d5c04d99cd88b36c0eb) - Initial changeset

- Updated dependencies [[`8cd0807`](https://github.com/arktypeio/arktype/commit/8cd080783fdbd8eefea54d5c04d99cd88b36c0eb)]:
  - @arktype/util@0.0.44
