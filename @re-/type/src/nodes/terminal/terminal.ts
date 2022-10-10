import { Base } from "../common.js"
import type { Check } from "../traverse/check.js"

export namespace Terminal {
    export abstract class Node<Def extends string> extends Base.Node {
        hasStructure = false

        constructor(protected def: Def) {
            super()
        }

        abstract allows(state: Check.State): void

        toDefinition() {
            return this.def
        }

        toString() {
            return this.def
        }

        toAst() {
            return this.def
        }

        typeDefIsKeyOf<Obj extends Record<string, unknown>>(
            obj: Obj
        ): this is Node<Extract<keyof Obj, string>> {
            return this.def in obj
        }
    }
}
