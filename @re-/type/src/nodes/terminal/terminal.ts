import { Base } from "../base.js"

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

        typeDefIsKeyOf<Obj extends Record<string, unknown>>(
            obj: Obj
        ): this is Node<Extract<keyof Obj, string>> {
            return this.def in obj
        }
    }
}
