# arktype

## 0.6.0

### Minor Changes

-   da4c2d63: allow adhoc problems via "mustBe" and "cases" codes
-   da4c2d63: add custom messages for validation keywords
-   da4c2d63: discriminated branches are now pruned to avoid redundant checks
-   da4c2d63: add config expressions, preserve configs during traversal
-   da4c2d63: add key traversal options for "distilled" and "strict" keys

### Patch Changes

-   da4c2d63: fix narrow tuple expression recursive inference
-   da4c2d63: add parsedNumber, parsedInteger validator keywords
-   da4c2d63: add Luhn Validation to creditCard keyword

## 0.5.1

### Patch Changes

-   7a6d6504: fix narrow tuple expression recursive inference

## 0.5.0

### Minor Changes

-   285842e4: allow adhoc problems via "mustBe" and "cases" codes
-   285842e4: discriminated branches are now pruned to avoid redundant checks

### Patch Changes

-   285842e4: add parsedNumber, parsedInteger validator keywords
-   285842e4: add Luhn Validation to creditCard keyword

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
