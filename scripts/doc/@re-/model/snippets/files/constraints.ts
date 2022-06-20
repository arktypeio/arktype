import { model } from "../src/index.js"

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

// Output: "Encountered errors at the following paths:
// {
//   email: ''david@redo.biz' is not assignable to /[a-z]*@redo.dev/.',
//   about/age: '17 was less than 18.',
//   about/bio: ''I am very interesting.I am very interesting.I am... was greater than 80 characters.'
// }"
console.log(error ?? "Flawless. Obviously.")
