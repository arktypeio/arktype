---
hide_table_of_contents: true
---

# narrow

## operator

-   [narrow](./narrow.md)

## tuple

-   ["type", =&gt; , condition]

## example

-   const narrow = type( ["number", =&gt; , (n) =&gt; n % 2 === 0]) <br/>
-   const isEven = (x: unknown): x is number =&gt; x % 2 === 0 <br/>
