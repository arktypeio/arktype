import { space, type } from "../../../src/api.js"

export const user = type({
    name: "string",
    browser: {
        kind: "'chrome'|'firefox'|'safari'",
        version: "number?"
    }
})

type User = typeof user.infer
