import type { Dictionary } from "@arktype/tools"
import { Base } from "../base.js"
import type { TraversalState } from "../traversal/traversal.js"

export namespace ObjectLiteral {
    export class Node extends Base.Node {
        readonly kind = "objectLiteral"
        definitionRequiresStructure = true

        constructor(public children: Base.Node[], public keys: string[]) {
            super()
        }

        allows(state: TraversalState<Dictionary>) {
            const root = state.data
            for (let i = 0; i < this.children.length; i++) {
                const k = this.keys[i]
                const child = this.children[i]
                state.path.push(k)
                if (k in root) {
                    state.data = root[k] as any
                    child.allows(state)
                    // TODO: Kind check
                } else if (child.kind !== "optional") {
                    // this.addMissingKeyDiagnostic(state, k)
                }
                state.path.pop()
            }
            state.data = root
        }

        get definition() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].definition
            }
            return result
        }

        get ast() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].ast
            }
            return result
        }

        toString() {
            if (!this.children.length) {
                return "{}"
            }
            let result = "{"
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result += this.keys[i] + ": " + this.children[i] + ", "
            }
            return result + this.children[i] + "}"
        }

        get mustBe() {
            return "anything" as const
        }
    }
}
