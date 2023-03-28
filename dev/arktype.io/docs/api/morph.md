---
hide_table_of_contents: true
---

# morph

## operator

-   [&vert;&gt;](./morph.md)

## tuple

-   [inputType, &vert;&gt;, (data) =&gt; output]

## helper

-   morph(inputType, (data) =&gt; output)

## example

-   const tupleMorph = type( ["string", &vert;&gt; , (data) =&gt; `morphed ${data}`]) <br/>
-   const helperMorph = morph("string", (data) =&gt; `morphed ${input}`) <br/>
