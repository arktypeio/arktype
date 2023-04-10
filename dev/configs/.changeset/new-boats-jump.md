---
"arktype": patch
---

## fixed a bug causing array elements after the first failure not to be checked

Previously, when checking an array, we'd bail out after the first failed element. Since all elements are at the same level, we should check each and provide problems when relevant, regardless of the validation result of previous elements (unless in failFast mode).

Thanks to @PointSingularity for this repro (can be found in the associated issue, https://github.com/arktypeio/arktype/issues/710):

```ts
import { type, scope } from "arktype"

export const badType = type("number[]")
export const { data, problems } = badType([1, 2, null, null])

// count should be 2
console.log("Problem count: ", problems?.count ?? 0)
```
