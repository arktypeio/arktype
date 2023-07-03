import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { InputParameterName } from "../../compile/compile.js"
import {
    type Constraint,
    definePrimitiveNode,
    type PrimitiveNode
} from "./primitive.js"

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
    `${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export type RegexConstraint = Constraint<"regex", SerializedRegexLiteral, {}>

export interface RegexNode extends PrimitiveNode<readonly RegexConstraint[]> {}

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
    literal.slice(1, literal.lastIndexOf("/"))

export const regexNode = definePrimitiveNode<RegexNode>(
    {
        kind: "regex",
        parse: (input) => listFrom(input).sort(),
        compileRule: (rule) => `${rule}.test(${InputParameterName})`,
        intersect: (l, r): RegexNode =>
            intersectUniqueLists(l.children, r.children)
    },
    (base) => ({
        description: `matched by ${base.children.join(", ")}`
    })
)
