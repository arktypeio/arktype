import { type } from "../../src/main.js"

const min: number = 2
const max: number = 2

// Non-narrowed number literals are allowed in expressions where they don't affect the inferred type.
const dynamicBounded = type(`${min}<number<${max}`)
//    ^?

// You'll get an error if you try to infer a dynamic literal directly:

const staticLiteral = type("2")
//    ^?

// @ts-expect-error
const dynamicLiteral = type(`${min}`)

// Or if you define a malformed literal that TypeScript won't narrow:

// @ts-expect-error
const badLiteral = type("5.0")
