// Most common TypeScript expressions just work...
export const userModel = model({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

// Mouse over "User" to see the inferred type...
export type User = typeof userModel.type
