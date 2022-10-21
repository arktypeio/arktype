import type { BigintLiteral } from "./bigint.js"
import type { NumberLiteral } from "./number.js"
import type { RegexLiteral } from "./regexLiteral.js"
import type { StringLiteral } from "./string.js"

export namespace Literal {
    export type Kinds = {
        bigintLiteral: BigintLiteral.Node
        numberLiteral: NumberLiteral.Node
        regexLiteral: RegexLiteral.Node
        stringLiteral: StringLiteral.Node
    }
}
