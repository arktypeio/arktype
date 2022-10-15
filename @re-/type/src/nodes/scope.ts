import type { Dictionary } from "@re-/tools"
import type { ArktypeOptions } from "../type.js"
import { Base } from "./base.js"
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
        readonly kind = "scope"
        children: [Base.Node]
        hasStructure: boolean

        constructor(child: Base.Node, protected context: Context) {
            super()
            this.children = [child]
            this.hasStructure = child.definitionHasStructure
        }

        allows(state: Check.State) {
            state.pushContext(this.context)
            this.children[0].allows(state)
            state.popContext()
        }

        toString() {
            return this.children[0].toString()
        }

        get ast() {
            return this.children[0].ast
        }

        get definition() {
            return this.children[0].definition
        }

        get mustBe() {
            return this.children[0].mustBe
        }
    }
}
