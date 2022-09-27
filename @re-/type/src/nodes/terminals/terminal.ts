import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { ConstraintToggles } from "../constraints/constraint.js"
import type { References } from "../traverse/exports.js"
import type { InferKeyword, KeywordDefinition } from "./keywords/keyword.js"
import type { RegexLiteralDefinition } from "./keywords/string.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    StringLiteralDefinition
} from "./literal.js"

export abstract class TerminalNode<
    Def extends string = string,
    AllowConstraints extends ConstraintToggles = {}
> extends Base.node<AllowConstraints> {
    constructor(protected typeDef: Def) {
        super()
    }

    protected get typeStr() {
        return this.typeDef
    }

    protected get typeAst() {
        return this.typeDef
    }

    collectReferences(args: References.ReferencesOptions, collected: KeySet) {
        if (!args.filter || args.filter(this.typeDef)) {
            collected[this.typeDef] = 1
        }
    }

    typeDefIsKeyOf<Obj extends Record<string, unknown>>(
        obj: Obj
    ): this is TerminalNode<Extract<keyof Obj, string>> {
        return this.typeDef in obj
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
