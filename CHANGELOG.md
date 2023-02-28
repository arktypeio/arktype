# arktype

## 1.0.5

### Patch Changes

-   [#663](https://github.com/arktypeio/arktype/pull/663) [`27b1d972`](https://github.com/arktypeio/arktype/commit/27b1d972e3fe5044571bd16508dd49ddee0d7592) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - temporarily disable numeric literal narrow validation in range and divisibility expressions

    Unfortunately, our StackBlitz demos rely on an older version of TypeScript (<4.8) that does not support number literal narrowing. Hopefully we can migrate them to WebContainers or find another platform to host our demos and reenable this feature.

-   [#663](https://github.com/arktypeio/arktype/pull/663) [`27b1d972`](https://github.com/arktypeio/arktype/commit/27b1d972e3fe5044571bd16508dd49ddee0d7592) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - fixed a bug affecting the traversal of object unions with distilled keys

-   [#663](https://github.com/arktypeio/arktype/pull/663) [`27b1d972`](https://github.com/arktypeio/arktype/commit/27b1d972e3fe5044571bd16508dd49ddee0d7592) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - Fixed a bug that caused keys to be prematurely removed in "distilled" mode within a union

-   [#663](https://github.com/arktypeio/arktype/pull/663) [`27b1d972`](https://github.com/arktypeio/arktype/commit/27b1d972e3fe5044571bd16508dd49ddee0d7592) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - fix a bug affecting the keyof operator when used with the intersection of an unbounded array and a tuple or record including a numeric key

-   [#663](https://github.com/arktypeio/arktype/pull/663) [`27b1d972`](https://github.com/arktypeio/arktype/commit/27b1d972e3fe5044571bd16508dd49ddee0d7592) Thanks [@ssalbdivad](https://github.com/ssalbdivad)! - temporarily disable narrowed numeric literal validation
