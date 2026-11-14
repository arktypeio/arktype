import { type } from "arktype"
import { optional } from "./helpers.ts"

// imported once a test runner has mocked ./helpers.ts
export const Optional = type(optional("string"))
