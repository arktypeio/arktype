import type { KeySet } from "@re-/tools"
import type { MetaToken } from "../../parser/common.js"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"

export abstract class NonTerminalNode<
    Token extends MetaToken,
    AllowedConstraint extends string = never
> extends Base.node<AllowedConstraint> {
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

    protected abstract typeAst(): readonly [
        Base.UnknownAst,
        Token,
        ...Base.UnknownAst[]
    ]
}
