import type { KeySet } from "@re-/tools"
import type { MetaToken } from "../../parser/common.js"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"

export abstract class NonTerminalNode<
    Token extends MetaToken
> extends Base.node {
    // TODO: Change token organization
    abstract token: Token
    constructor(protected children: Base.node[]) {
        super()
    }

    collectReferences(opts: References.ReferencesOptions, collected: KeySet) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }

    abstract toAst(): readonly [Base.UnknownAst, Token, ...Base.UnknownAst[]]
}
