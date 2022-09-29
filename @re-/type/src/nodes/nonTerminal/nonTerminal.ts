import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"
import type { Branching } from "./branching/branching.js"
import type { Constraining } from "./constraining/constraining.js"
import type { Unary } from "./unary/unary.js"

export namespace NonTerminal {
    export type Token = Unary.Token | Branching.Token | Constraining.Token

    export abstract class Node<T extends Token> extends Base.node {
        abstract token: T
        constructor(protected children: Base.node[]) {
            super()
        }

        collectReferences(
            opts: References.ReferencesOptions,
            collected: KeySet
        ) {
            for (const child of this.children) {
                child.collectReferences(opts, collected)
            }
        }

        abstract toAst(): readonly [Base.UnknownAst, T, ...Base.UnknownAst[]]
    }
}
