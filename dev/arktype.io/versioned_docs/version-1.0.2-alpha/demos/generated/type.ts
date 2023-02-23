export default `import { type } from "../src/main"

// Define a type...
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Infer it...
export type User = typeof user.infer

// Validate your data anytime, anywhere, with the same clarity and precision you expect from TypeScript.
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
`
