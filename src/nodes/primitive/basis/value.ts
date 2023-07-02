import {
    cached,
    domainOf,
    prototypeKeysOf,
    stringify
} from "../../../../dev/utils/src/main.js"
import {
    compileCheck,
    compileSerializedValue,
    InputParameterName
} from "../../../compile/state.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<unknown> {
    serialized: string
}

export const valueNode = defineNodeKind<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compile: (rule, ctx) =>
            compileCheck(
                "value",
                rule,
                `${InputParameterName} === ${compileSerializedValue(rule)}`,
                ctx
            )
    },
    (base) => {
        const literalKeys =
            base.rule === null || base.rule === undefined
                ? []
                : [...prototypeKeysOf(base.rule), ...Object.keys(base.rule)]
        return {
            serialized: compileSerializedValue(base.rule),
            domain: domainOf(base.rule),
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            description: stringify(base.rule)
        }
    }
)
