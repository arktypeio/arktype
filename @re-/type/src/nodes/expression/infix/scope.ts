import type { Dictionary } from "@re-/tools"
import type { ArktypeOptions } from "../../../type.js"
import { Base } from "../../common.js"
import type { Check } from "../../traverse/check.js"

export namespace Scope {
    export type Context = ArktypeOptions & {
        resolutions?: Dictionary<Base.Node>
    }

    export const merge = (base: Context, merged: Context): Context => ({
        errors: { ...base.errors, ...merged.errors },
        resolutions: merged.resolutions ?? base.resolutions
    })

    export class Node extends Base.Node {
        hasStructure: boolean

        constructor(protected child: Base.Node, protected context: Context) {
            super()
            this.hasStructure = child.hasStructure
        }

        allows(state: Check.State) {
            state.pushContext(this.context)
            this.child.allows(state)
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
