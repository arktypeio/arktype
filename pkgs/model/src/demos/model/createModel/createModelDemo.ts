import { create } from "@re-/model"

// Most common TypeScript expressions just work...
export const userModel = create({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

//@re_place createModelDemo.ts taggedThing
// Mouse over "User" to see the inferred type...
export type User = typeof userModel.type

// But a model can also validate your data at runtime...
export const userData = {
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    browser: null // :(
}

export const userValidationResult = userModel.validate(userData)
// Try changing "userModel" or "userData" and see what happens!

//@re_place createModelDemo.ts
