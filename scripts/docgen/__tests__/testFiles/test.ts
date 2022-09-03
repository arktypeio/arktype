// @ts-nocheck
import { type } from "@re-/type"

//@snipStart:snip1
// Most common TypeScript expressions just work...
export const user = type({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

// Mouse over "User" to see the inferred type...
// @ignore-unused
//@snipLine:line1
export type User = typeof user.type
//@snipEnd:snip1

//@snipStatement:commentStatement
// But a type can also validate your data at runtime...
export const userData = {
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    browser: "Internet Explorer" // :(
}

// @ignore-unused
export const userValidationResult = user.check(userData)

// Try changing "user" or "userData" and see what happens!
