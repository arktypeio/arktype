import type { RegexLiteral } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"

export type StringAttributes = {
    readonly regex?: readonly RegexLiteral[]
    readonly bounds?: Bounds
}
