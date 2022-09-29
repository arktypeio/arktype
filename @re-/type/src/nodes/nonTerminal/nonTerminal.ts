import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"
import { Infix } from "./infix/infix.js"
import { Postfix } from "./postfix/postfix.js"

export namespace NonTerminal {
    export const tokens = { ...Postfix.tokens, ...Infix.tokens }

    export type Token = Postfix.Token | Infix.Token

    export abstract class Node extends Base.node {
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
    }
}
