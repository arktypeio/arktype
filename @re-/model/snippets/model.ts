import { model } from "../src/index.js"

// A model is defined just like a type...
export const user = model({
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null",
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    }
})

// And can be used just like a type...
export type User = typeof user.type
export type IsEquivalentTo = {
    age: number
    browser: "chrome" | "firefox" | "other" | null
    name: {
        first: string
        middle?: string
        last: string
    }
}

// That also validates your data at runtime.
export const fetchUser = () => {
    return {
        name: {
            first: "Reed",
            last: "Doe"
        },
        age: 28,
        browser: "Internet Explorer" // :(
    }
}

// "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
export const { error } = user.validate(fetchUser())

// Try changing "user" or "fetchUser" and see what happens!
