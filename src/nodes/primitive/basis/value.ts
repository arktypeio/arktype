import {
    cached,
    domainOf,
    prototypeKeysOf,
    stringify
} from "../../../../dev/utils/src/main.js"
import {
    compileSerializedValue,
    InputParameterName
} from "../../../compile/compile.js"
import { node } from "../../../main.js"
import { type Constraint, definePrimitiveNode } from "../primitive.js"
import type { BaseBasis } from "./basis.js"
import { intersectBases } from "./basis.js"

export type ValueConstraint = Constraint<"value", unknown, {}>

export interface ValueNode extends BaseBasis<ValueConstraint> {
    serialized: string
}

export const valueNode = definePrimitiveNode<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compileRule: (rule) =>
            `${InputParameterName} === ${compileSerializedValue(rule)}`
    },
    (base) => {
        const literalKeys =
            base.children === null || base.children === undefined
                ? []
                : [
                      ...prototypeKeysOf(base.children),
                      ...Object.keys(base.children)
                  ]
        return {
            serialized: compileSerializedValue(base.children),
            domain: domainOf(base.children),
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            description: stringify(base.children)
        }
    }
)
