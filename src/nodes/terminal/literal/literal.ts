import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"
import type { BigintLiteral } from "./bigint.js"
import type { NumberLiteral } from "./number.js"
import type { RegexLiteral } from "./regexLiteral.js"
import type { StringLiteral } from "./string.js"

export namespace PrimitiveLiteral {
    export type Value = number | string | bigint

    export abstract class Node extends Terminal.Node {
        abstract readonly kind: KindName
        abstract readonly value: Value

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
        }

        addAttributes(attributes: Base.Attributes) {
            attributes.add("value", this.value)
        }

        get description() {
            return this.definition as this["definition"]
        }
    }

    export type Kinds = {
        bigintLiteral: BigintLiteral.Node
        numberLiteral: NumberLiteral.Node
        doubleQuotedStringLiteral: StringLiteral.DoubleQuotedNode
        singleQuotedStringLiteral: StringLiteral.SingleQuotedNode
    }

    export type KindName = keyof Kinds
}

export namespace Literal {
    export type Kinds = PrimitiveLiteral.Kinds & {
        regexLiteral: RegexLiteral.Node
    }

    export type KindName = keyof Kinds
}
