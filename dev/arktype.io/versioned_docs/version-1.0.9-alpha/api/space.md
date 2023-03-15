---
hide_table_of_contents: true
---

# Space

## text

```ts
export type Space<exports = Dict> = {
    [k in keyof exports]: Type<exports[k]>
}
```
