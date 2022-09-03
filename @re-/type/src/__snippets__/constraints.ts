import { type } from "../index.js"

export const employee = type({
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
export type Employee = typeof employee.infer

// The error messages are so nice you might be tempted to break your code more often ;)
export const { errors } = employee.check({
    email: "david@redo.biz",
    about: {
        age: 17,
        bio: "I am very interesting.".repeat(5)
    }
})

console.log(errors?.summary ?? "Flawless. Obviously.")
