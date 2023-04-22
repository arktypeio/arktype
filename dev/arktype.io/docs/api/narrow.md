---
hide_table_of_contents: true
---

# narrow

## operator

-   [=>](./narrow.md)

## tuple

-   ["type", "=>" , condition] <br/>
-   const narrow = type( ["number", "=>" , (n) => n % 2 === 0])<br/>

## example

-                                const isEven = (x: unknown): x is number => x % 2 === 0
