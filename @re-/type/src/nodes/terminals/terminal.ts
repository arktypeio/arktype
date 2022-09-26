import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { References } from "../traverse/exports.js"
import type { InferKeyword, KeywordDefinition } from "./keywords/keyword.js"
import type { RegexLiteralDefinition } from "./keywords/string.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    StringLiteralDefinition
} from "./literal.js"

export type TerminalConstructorArgs<Definition extends string = string> = [
    definition: Definition,
    context: Base.context
]

export abstract class TerminalNode<
    Definition extends string = string
> extends Base.node<Definition> {
    constructor(...[def, ctx]: TerminalConstructorArgs<Definition>) {
        super(def, def, ctx)
    }

    toString() {
        return this.def
    }

    collectReferences(args: References.ReferencesOptions, collected: KeySet) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = 1
        }
    }

    definitionIsKeyOf<Obj extends Record<string, unknown>>(
        obj: Obj
    ): this is Base.node<Extract<keyof Obj, string>> {
        return this.def in obj
    }
}

export type InferTerminal<
    Token extends string,
    Resolutions
> = Token extends KeywordDefinition
    ? InferKeyword<Token>
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
