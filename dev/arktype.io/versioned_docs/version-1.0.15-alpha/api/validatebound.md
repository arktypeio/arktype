---
hide_table_of_contents: true
---

# validateBound

## operator

- [bound](./validatebound.md)

## tableRow

| Variable | Description                            |
| -------- | -------------------------------------- |
| N        | number literal                         |
| S        | sized data (a number, string or array) |
| <        | Comparator (one of <, <=, ==, >=, >)   |

## description

- Bound operators allow data to be bounded in the format "S<N", or as a Range: "N<S<N", with comparators restricted to < or <=

## string

- "N<S<N", with comparators restricted to < or <= <br/>
- const range = type("2<=number<5")<br/>
- const bound = type("string[]==5")<br/>
