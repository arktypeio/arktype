import { Base } from "../../common.js"
import type { Arr } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Unary {
    export type Token = Optional.Token | Arr.Token

    export abstract class Node extends Base.Node {
        constructor(protected child: Base.Node) {
            super([child], child.hasStructure)
        }
    }
}
