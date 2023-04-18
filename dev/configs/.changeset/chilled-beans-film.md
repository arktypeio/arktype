---
"arktype": patch
---

## add a syntax error when defining an expression with multiple right bounds

Ensures expressions like the following result in a syntax error during type validation (will currently not throw at runtime):

```ts
// Type Error: `Expression 'number' must have at most one right bound`
const boundedNumber = type("number>0<=200")
```
