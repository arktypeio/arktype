---
hide_table_of_contents: true
---

# morph

## operator

&lt;code&gt;- [&vert;&gt;](./morph.md)  
&lt;/code&gt;

## tuple

&lt;code&gt;- [inputType, &vert;&gt;, (data) =&gt; output] <br/>

-   const tupleMorph = type( ["string", "&vert;&gt;" , (data) =&gt; \`morphed ${data}\`])<br/>
    &lt;/code&gt;

## helper

&lt;code&gt;- morph(inputType, (data) =&gt; output) <br/>

-   const helperMorph = morph("string", (data) =&gt; \`morphed ${input}\`)<br/>
    &lt;/code&gt;
