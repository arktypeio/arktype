---
"@arktype/attest": patch
---

### Add .satisfies as an attest assertion to compare the value to an ArkType definition.

```ts
attest({ foo: "bar" }).satisfies({ foo: "string" })

// Error: foo must be a number (was string)
attest({ foo: "bar" }).satisfies({ foo: "number" })
```
