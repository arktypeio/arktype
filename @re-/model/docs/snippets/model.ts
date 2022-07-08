import { model } from "../../src/index.js"

// Models look just like types...
export const user = model({
    name: "string",
    browser: {
        kind: "'chrome'|'firefox'|'safari'",
        version: "number?"
    }
})

// And can be used just like types...
export type User = typeof user.type

// But can also validate your data at runtime...
export const fetchUser = () => ({
    name: "Dan Abramov",
    browser: {
        kind: "Internet Explorer" // RIP
    }
})

// "At path browser/kind, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'safari'."
export const { error } = user.validate(fetchUser())

// Try changing "user" or "fetchUser" and see what happens!
