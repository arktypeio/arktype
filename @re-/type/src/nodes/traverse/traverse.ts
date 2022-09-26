import type { TypeOptions } from "../../type.js"
import type { Path } from "../common.js"

export class TraversalState {
    path: Path = []
    seen: string[] = []

    constructor(public options: TypeOptions) {}
}
