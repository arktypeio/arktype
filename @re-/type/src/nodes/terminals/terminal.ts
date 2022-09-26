import { Base } from "../base.js"
import type { RootNode, StrAst } from "../common.js"
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
> extends Base.node<Definition, StrAst> {
    constructor(...[definition, context]: TerminalConstructorArgs<Definition>) {
        super(definition, definition, context)
    }

    toString() {
        return this.definition
    }

    collectReferences(
        args: References.ReferencesOptions,
        collected: References.ReferenceCollection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }

    definitionIsKeyOf<Obj extends Record<string, unknown>>(
        obj: Obj
    ): this is Base.node<Extract<keyof Obj, string>> {
        return this.definition in obj
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
