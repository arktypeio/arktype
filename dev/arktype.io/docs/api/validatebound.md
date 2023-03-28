---
hide_table_of_contents: true
---

# validateBound

## operator

-   [bound](./validatebound.md)

## string

-   "N&lt;S&lt;N", with comparators restricted to `&lt;` or `&lt;=`

## param

| Variable | Description                                                |
| -------- | ---------------------------------------------------------- |
| N:       | number literal                                             |
| S:       | sized data (a number, string or array)                     |
| &lt;:    | Comparator (one of "&lt;", "&lt;=", "==", "&gt;=", "&gt;") |

## comparators

-   [&lt;,&gt;,&lt;=,&gt;=,==]

## Bound

-   "S&lt;N"

## Range

-   "N&lt;S&lt;N", with comparators restricted to `&lt;` or `&lt;=`

## example

-   "string&lt;5" <br/>
-   "2&gt;=number&gt;=5" <br/>
-   "string[]===5" <br/>
