import type { Base } from "../common.js"
import type { ArktypeOptions } from "../roots/type.js"
import type { Check } from "../traverse/check.js"

export namespace Scope {
    export type Context = ArktypeOptions

    export const merge = (base: Context, merged: Context): Context => ({
        errors: { ...base.errors, ...merged.errors }
    })

    export class Node implements Base.Node {
        hasStructure: boolean

        constructor(protected child: Base.Node, protected context: Context) {
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
