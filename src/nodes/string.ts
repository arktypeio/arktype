import type { RegexLiteral } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"

export type StringAttributes = {
    regex?: RegexLiteral[]
    bounds?: Bounds
}
