---
"arktype": patch
---

improve type summaries for tuple/array intersections

This change improves the inferred types of array intersections including one or more tuples.

```ts
const tupleAndArray = type([[{ a: "string" }], "&", [{ b: "boolean" }, "[]"]])

// Failed to preserve tuple when inferring result
type PreviousResult = { a: string; b: boolean }[]

// Correctly preserves tuple literal
type UpdatedResult = [{ a: string; b: boolean }]
```

Thanks to KingPhipps on Twitter for [the inspiration](https://twitter.com/KingPhipps/status/1635212259973795841?s=20)!
