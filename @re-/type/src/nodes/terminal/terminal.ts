import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"

export namespace Terminal {
    export abstract class Node<Def extends string = string> extends Base.node {
        constructor(protected def: Def) {
            super()
        }

        toIsomorphicDef() {
            return this.def
        }

        toString() {
            return this.def
        }

        toAst() {
            return this.def
        }

        collectReferences(
            args: References.ReferencesOptions,
            collected: KeySet
        ) {
            if (!args.filter || args.filter(this.def)) {
                collected[this.def] = 1
            }
        }

        typeDefIsKeyOf<Obj extends Record<string, unknown>>(
            obj: Obj
        ): this is Node<Extract<keyof Obj, string>> {
            return this.def in obj
        }
    }
}
