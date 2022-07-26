import { Base } from "../base/index.js"
import { AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import { InferLiteral } from "./literal/literal.js"

export type InferTerminalStr<
    Token extends string,
    Ctx extends Base.Parsing.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["dict"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>
