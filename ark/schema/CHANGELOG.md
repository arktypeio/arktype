# @arktype/schema

## 0.1.19

### Patch Changes

- [#1038](https://github.com/arktypeio/arktype/pull/1038) [`16ae134`](https://github.com/arktypeio/arktype/commit/16ae1341d25c4bef962b5665be1486d734d10d25) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Bump version

## 0.1.18

### Patch Changes

- [#1028](https://github.com/arktypeio/arktype/pull/1028) [`5fe79c6`](https://github.com/arktypeio/arktype/commit/5fe79c6c8db94f20c997c7a8960edb9d69468b69) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Bump version

- Updated dependencies [[`5fe79c6`](https://github.com/arktypeio/arktype/commit/5fe79c6c8db94f20c997c7a8960edb9d69468b69)]:
  - @arktype/util@0.0.51

## 0.1.17

### Patch Changes

- [#1024](https://github.com/arktypeio/arktype/pull/1024) [`5284b60`](https://github.com/arktypeio/arktype/commit/5284b6054209ffa38f02ae010c3e9ab3dff93653) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - ### Add support for index access, less indeterminate morph union errors (see full release notes in [ArkType's CHANGELOG](../type/CHANGELOG.md))

- Updated dependencies [[`1bf2066`](https://github.com/arktypeio/arktype/commit/1bf2066800ce65edc918a24c251ce20f1ccf29f4)]:
  - @arktype/util@0.0.50

## 0.1.16

### Patch Changes

- [#1011](https://github.com/arktypeio/arktype/pull/1011) [`2be4f5b`](https://github.com/arktypeio/arktype/commit/2be4f5b391d57ad47dc6f4c0e4c9d31ae6b550c5) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - ### Improve discrimination logic across several issues (see primary release notes at [ArkType's CHANGELOG](../type/CHANGELOG.md))

- Updated dependencies [[`2be4f5b`](https://github.com/arktypeio/arktype/commit/2be4f5b391d57ad47dc6f4c0e4c9d31ae6b550c5)]:
  - @arktype/util@0.0.49

## 0.1.15

### Patch Changes

- [#1008](https://github.com/arktypeio/arktype/pull/1008) [`3957acd`](https://github.com/arktypeio/arktype/commit/3957acd68b753abfd370e99be361981f74c6f95d) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Add a new default `format` subscope

## 0.1.14

### Patch Changes

- [#1004](https://github.com/arktypeio/arktype/pull/1004) [`bf85e7d`](https://github.com/arktypeio/arktype/commit/bf85e7dec809169a7749c8e7af9003230e09b98f) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - (see [arktype CHANGELOG](../type/CHANGELOG.md))

  ### Allow overriding builtin keywords

  ### Fix a ParseError compiling certain morphs with cyclic inputs

  ### Rename RegexNode to PatternNode

## 0.1.13

### Patch Changes

- [#999](https://github.com/arktypeio/arktype/pull/999) [`21c0105`](https://github.com/arktypeio/arktype/commit/21c0105a0c4ee45b8fd95e2c547724570742f6b0) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Fix chained .describe() on union types (see [arktype CHANGELOG](../type/CHANGELOG.md))

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
