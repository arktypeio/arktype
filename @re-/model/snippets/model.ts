import { model } from "../src/index.js"

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
export type IsEquivalentTo = {
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
            first: "Reed",
            last: "Doe"
        },
        age: 28,
        browser: "Internet Explorer" // :(
    }
}

// Models can validate your data anytime, anywhere, with the clarity and precision of TypeScript.
export const { error, data } = user.validate(fetchUser())

if (error) {
    // "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
    console.log(error.message)
} else {
    console.log(data)
}

// Try changing "user" or "fetchUser" and see what happens!
