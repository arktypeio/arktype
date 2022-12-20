# How to use this beaut

Creating a simple string schema

```ts
import { type } from "arktype"

const stringData = type("string")

stringData.assert("Arktype") // "Arktype"
stringData.assert({}) // throws ArktypeError
```
