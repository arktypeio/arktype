import { model } from "../../src/index.js"

// Models look just like types...
export const user = model({
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null",
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    }
})

// And can be used just like types...
export type User = typeof user.type
export type EquivalentType = {
    age: number
    browser: "chrome" | "firefox" | "other" | null
    name: {
        first: string
        middle?: string
        last: string
    }
}

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
