---
hide_table_of_contents: true
---

# validateBound

## operator

-   [bound](./validatebound.md)

## string

-   "N<S<N", with comparators restricted to < or <= <br/>
-   const range = type("2<=number<5")<br/>
-   const bound = type("string[]==5")<br/>

## tablifiedInfo

| Variable | Description                            |
| -------- | -------------------------------------- |
| N        | number literal                         |
| S        | sized data (a number, string or array) |
| <        | Comparator (one of <, <=, ==, >=, >)   |

## Bound

-   "S<N"

## Range

-   "N<S<N", with comparators restricted to < or <=
