---
hide_table_of_contents: true
---

# Problems

## text

```ts
Problems: new (state: TraversalState) => readonly Problem[] & {
    [k in Exclude<keyof ProblemArray, keyof unknown[]>]: ProblemArray[k];
}
export type Problems = instanceOf<typeof Problems>;
```
