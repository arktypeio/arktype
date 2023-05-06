export default `/* eslint-disable @typescript-eslint/no-unused-vars */
import { type } from "arktype"

const min = 2 as number
const max = 2 as number

// Non-narrowed number literals are allowed in expressions where they don't affect the inferred type.
const dynamicBounded = type(\`\${min}<number<\${max}\`)
//    ^?

// You'll get an error if you try to infer a dynamic literal directly:

const staticLiteral = type("2")
//    ^?

// TODO: Test (doesn't work with 4.9?)
// @ts-expect-error
const dynamicLiteral = type(\`\${min}\`)

// Or if you define a malformed literal that TypeScript won't narrow:

// @ts-expect-error
const badLiteral = type("5.0")
`
