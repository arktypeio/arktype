import { type } from "../../src/main.ts"

// Define your type...
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Infer it...
export type User = typeof user.infer

// Get validated data or clear, customizable error messages.
export const { data, problems } = user({
    name: "Alan Turing",
    device: {
        platform: "enigma"
    }
})

if (problems) {
    // "device/platform must be 'android' or 'ios' (was 'enigma')"
    console.log(problems.summary)
}
