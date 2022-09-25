import type { TypeOptions } from "../../type.js"
import type { Path } from "../common.js"

// TODO: State based traversal?
export class TraversalState {
    path: Path = []
    seen: string[] = []

    constructor(public options: TypeOptions) {}
}
