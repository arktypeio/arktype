import { define } from "@re-/model"

// Most common TypeScript expressions just work...
export const userModel = define({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    interests: "string[]"
})

// And can be used to validate your data at runtime!
export const userData = {
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    interests: undefined
}

// If you're using TypeScript, you can also create a type!
export type User = typeof userModel.type

// Try changing "userModel" or "userData" and see what happens!
export const userValidationResult = userModel.validate(userData)
