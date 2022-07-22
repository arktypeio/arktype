import { type } from "../../src/index.js"

// Define a type...
export const user = type({
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null",
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    }
})

// Infer it...
export type User = typeof user.infer

// But while types are confined to your IDE...
export const fetchUser = () => {
    return {
        name: {
            first: "Dan",
            last: "Ambramov"
        },
        age: 29,
        browser: "Internet Explorer" // R.I.P.
    }
}

// Models can validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
export const { error, data } = user.validate(fetchUser())

if (error) {
    // "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
    console.log(error.message)
}

// Try changing "user" or "fetchUser" and see what happens!
