---
hide_table_of_contents: true
---

# narrow

## operator

-   [=&gt;](./narrow.md)

## tuple

-   ["type", "=&gt;" , condition] <br/>
-   const narrow = type( ["number", "=&gt;" , (n) =&gt; n % 2 === 0])<br/>

## helper

-   const isEven = (x: unknown): x is number =&gt; x % 2 === 0
