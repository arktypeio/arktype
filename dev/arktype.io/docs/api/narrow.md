---
hide_table_of_contents: true
---

# narrow

## operator

&lt;code&gt;- [=&gt;](./narrow.md)  
&lt;/code&gt;

## tuple

&lt;code&gt;- ["type", =&gt; , condition] <br/>

-   const narrow = type( ["number", "=&gt;" , (n) =&gt; n % 2 === 0])<br/>
    &lt;/code&gt;

## helper

&lt;code&gt;- const isEven = (x: unknown): x is number =&gt; x % 2 === 0
&lt;/code&gt;
