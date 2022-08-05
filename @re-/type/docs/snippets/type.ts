import { type } from "../../src/index.js"

// Define a type...
export const user = type({
    name: "string",
    browser: {
        kind: "'chrome'|'firefox'|'safari'",
        version: "number?"
    }
})

// Infer it...
export type User = typeof user.infer

// Models can validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
export const { error, data } = user.validate({
    name: "Dan Abramov",
    browser: {
        kind: "Internet Explorer" // R.I.P.
    }
})

if (error) {
    // "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
    console.log(error.message)
}
