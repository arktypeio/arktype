import type { Dictionary } from "@re-/tools"
import type { ArktypeOptions } from "../type.js"
import { Base } from "./common.js"
import type { Check } from "./traverse/check.js"

export namespace Scope {
    export type Context = ArktypeOptions & {
        resolutions?: Dictionary<Base.Node>
    }

    export const merge = (base: Context, merged: Context): Context => ({
        errors: { ...base.errors, ...merged.errors },
        resolutions: base.resolutions
    })

    export class Node extends Base.Node {
        constructor(protected child: Base.Node, protected context: Context) {
            super([child], child.hasStructure)
        }

        allows(state: Check.State) {
            state.pushContext(this.context)
            this.child.allows(state)
            state.popContext()
        }

        toString() {
            return this.child.toString()
        }

        get ast() {
            return this.child.ast
        }

        get definition() {
            return this.child.definition
        }
    }
}
