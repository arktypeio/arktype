# arktype

## 0.4.0

### Minor Changes

-   33682224: add expression helper functions (intersection, arrayOf, etc.)
-   33682224: include prototype keys in keyof types, align inference with TS keyof

## 0.3.0

### Minor Changes

-   db9379ee: improve problem configs, make them available at type and scope levels
-   db9379ee: add prerequisite props (props that must be valid for others to check)
-   db9379ee: keep track of configs during traversal, query most specific relevant options
-   db9379ee: fix return values for nested morphs
-   db9379ee: infer keyof array types as `${number}`

### Patch Changes

-   db9379ee: fix multi-part error message writers

## 0.2.0

### Minor Changes

-   37aa4054: improve problem configs, make them available at type and scope levels
-   37aa4054: keep track of configs during traversal, query most specific relevant options

### Patch Changes

-   37aa4054: fix multi-part error message writers

## 0.1.4

### Patch Changes

-   27f2ec8c: improve duplicate alias error messages for scope imports
-   27f2ec8c: add validation for keyof operands

## 0.1.3

### Patch Changes

-   f3776be1: add new default jsObjects space
-   f3776be1: replace subdomain with objectKind, allow configurable instanceof checks

## 0.1.2

### Patch Changes

-   6956bae: allow access to internal API through arktype/internal

## 0.1.1

### Patch Changes

-   3a0fa48: - include data in check results regardless of success
    -   fix morph inference within node definitions

## 0.1.0

### Minor Changes

-   cad89ca: refactor: arktype 1.0 prerelease
