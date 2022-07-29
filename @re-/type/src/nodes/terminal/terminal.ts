import { Create, References, Validation } from "../base/features/index.js"
import { Base } from "../base/index.js"
import { Node } from "../base/parse/node.js"
import { defToString } from "../base/utils.js"
import { AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import { InferLiteral } from "./literal/literal.js"

export abstract class Terminal<DefType = string> extends Node {
    constructor(public def: DefType) {
        super()
    }

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown

    toString() {
        return defToString(this.def)
    }

    collectReferences(
        args: References.Options,
        collected: References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}

export type InferTerminalStr<
    Token extends string,
    Ctx extends Base.Parsing.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["dict"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>
