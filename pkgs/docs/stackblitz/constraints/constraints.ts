import { create } from "@re-/model"

export const employeeModel = create({
    // Not a fan of regex? Don't worry, 'email' is a builtin type :)
    email: `/[a-z]*@redo\.dev/`,
    about: {
        // Single or double bound numeric types
        age: "18<=integer<125",
        // Or string lengths
        bio: "string<=160"
    }
})

// Subtypes like 'email' and 'integer' become 'string' and 'number'
export type Employee = typeof employeeModel.type

export const employeeData = {
    email: "david@redo.biz",
    about: {
        age: 17,
        bio: "I am very interesting.".repeat(10)
    }
}

// The error messages are so nice you might be tempted to break your code more often ;)
export const employeeValidationResult = employeeModel.validate(employeeData)

// Try modifying "employeeModel" or "employeeData" and see what happens!
