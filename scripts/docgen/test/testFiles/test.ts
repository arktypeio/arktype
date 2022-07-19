// @ts-ignore
import { model } from "@re-/model"

//@snipStart:snip1
// Most common TypeScript expressions just work...
export const userModel = model({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

// Mouse over "User" to see the inferred type...
//@snipLine:line1
export type User = typeof userModel.type
//@snipEnd:snip1

//@snipStatement:commentStatement
// But a model can also validate your data at runtime...
export const userData = {
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    browser: "Internet Explorer" // :(
}

export const userValidationResult = userModel.validate(userData)

// Try changing "userModel" or "userData" and see what happens!
