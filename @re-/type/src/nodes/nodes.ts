import type { Union } from "./expression/branching/union.js"
import type { Optional } from "./expression/optional.js"

export type NodeKinds = {
    optional: Optional.Node
    union: Union.Node
}

export type NodeKind = keyof NodeKinds
