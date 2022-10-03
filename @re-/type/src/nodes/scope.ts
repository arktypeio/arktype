import type { Base } from "./base.js"
import type { Check } from "./traverse/check/check.js"
import type { OptionsByDiagnostic } from "./traverse/check/diagnostics.js"

export namespace Scope {
    export type Context = {
        errors?: OptionsByDiagnostic
    }

    export class Node implements Base.Node {
        hasStructure: boolean

        constructor(public child: Base.Node, public context: Context) {
            this.hasStructure = child.hasStructure
        }

        check(state: Check.State) {
            state.pushContext(this.context)
            this.child.check(state)
            state.popContext()
        }

        toString() {
            return this.child.toString()
        }

        toAst() {
            return this.child.toAst()
        }

        toDefinition() {
            return this.child.toDefinition()
        }
    }
}
