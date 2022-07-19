```ts
import { define } from "./declaration.js"

export const groupDef = define.group({
    title: "string",
    members: "user[]"
})
```

//@snipStart:test1
Hello.
//@snipEnd:test1

```ts
//@snipLine:line
import { model } from "@re-/model"

//@snipStatement:employee
const employee = model({
    // Not a fan of regex? Don't worry, 'email' is a builtin type :)
    email: `/[a-z]*@redo.dev/`,
    about: {
        // Single or double bound numeric types
        age: "18<=integer<125",
        // Or string lengths
        bio: "string<=80"
    }
})

// Subtypes like 'email' and 'integer' become 'string' and 'number'
type Employee = typeof employee.type

// The error messages are so nice you might be tempted to break your code more often ;)
const { error } = employee.validate({
    email: "david@redo.biz",
    about: {
        age: 17,
        bio: "I am very interesting.".repeat(5)
    }
})
```
