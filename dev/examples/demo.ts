import { type } from "../../src/main.js"

// Define your type...
export const pkg = type({
    name: "string",
    version: "semver",
    "contributors?": "1<email[]<=10"
})

// Infer it...
export type Package = typeof pkg.infer

// Get validated data or clear, customizable error messages.
export const { data, problems } = pkg({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io"]
})

// "contributors must be more than 1 items long (was 1)"
console.log(problems?.summary ?? data)
