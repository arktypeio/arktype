import { type } from "../api.ts"

// Define a type...
export const user = type({
    name: "string",
    browser: {
        kind: "'chrome'|'firefox'|'safari'",
        "version?": "number"
    }
})

// Infer it...
export type User = typeof user.infer

export const fetchUser = () => ({
    name: "Dan Abramov",
    browser: {
        kind: "Internet Explorer" // R.I.P.
    }
})

// Types can validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
export const { data, problems } = user(fetchUser())

if (problems) {
    console.log(problems.summary)
}
