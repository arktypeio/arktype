import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { References } from "../traverse/exports.js"
import type { Keyword } from "./keywords/keyword.js"
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

export type InferTerminal<
    Token extends string,
    Resolutions
> = Token extends Keyword.Definition
    ? Keyword.Infer<Token>
    : Token extends keyof Resolutions
    ? RootNode.Infer<Resolutions[Token], Resolutions>
    : Token extends StringLiteralDefinition<infer Value>
    ? Value
    : Token extends RegexLiteralDefinition
    ? string
    : Token extends NumberLiteralDefinition<infer Value>
    ? Value
    : Token extends BigintLiteralDefinition<infer Value>
    ? Value
    : Token extends BooleanLiteralDefinition<infer Value>
    ? Value
    : unknown
