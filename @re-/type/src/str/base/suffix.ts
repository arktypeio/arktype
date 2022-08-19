import { Base } from "../../index.js"
import { Bound } from "../../nonTerminal/index.js"
import { SuffixToken } from "./tokens.js.js.js"

type SuffixLeft = {
    root: Base.Node
    bounds: Bound.State
    nextSuffix: SuffixToken
}

export class Suffix<
    Constraints extends Partial<SuffixLeft> = {},
    L extends SuffixLeft = SuffixLeft & Constraints
> {
    constructor(
        public root: L["root"],
        public bounds: L["bounds"],
        public nextSuffix: L["nextSuffix"]
    ) {}
}

export namespace Suffix {
    export type Base = {
        bounds: Bound.State
        root: unknown
        nextSuffix: SuffixToken
    }

    export type From<S extends Base> = S
}
