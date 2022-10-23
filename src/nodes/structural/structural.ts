import type { ObjectLiteral } from "./objectLiteral.js"
import type { Tuple } from "./tuple.js"

export namespace Structural {
    export type Kinds = {
        objectLiteral: ObjectLiteral.Node
        tuple: Tuple.Node
    }
}
