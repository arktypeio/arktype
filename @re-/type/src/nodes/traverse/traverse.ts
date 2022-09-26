import type { TypeOptions } from "../../scopes/type.js"
import type { Path } from "../common.js"

export class TraversalState {
    path: Path = []
    seen: string[] = []

    constructor(public options: TypeOptions) {}
}
