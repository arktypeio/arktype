import type { Union } from "../branching/union.js"
import type { Optional } from "../unary/optional.js"

export type NodeKinds = {
    optional: Optional.Node
    union: Union.Node
}

export type NodeKind = keyof NodeKinds
