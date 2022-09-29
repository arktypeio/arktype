import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { References } from "../traverse/exports.js"
import type { Keyword } from "./keyword/keyword.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    StringLiteralDefinition
} from "./literal.js"

export abstract class TerminalNode<
    Def extends string = string
> extends Base.node {
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

    collectReferences(args: References.ReferencesOptions, collected: KeySet) {
        if (!args.filter || args.filter(this.def)) {
            collected[this.def] = 1
        }
    }

    typeDefIsKeyOf<Obj extends Record<string, unknown>>(
        obj: Obj
    ): this is TerminalNode<Extract<keyof Obj, string>> {
        return this.def in obj
    }
}
