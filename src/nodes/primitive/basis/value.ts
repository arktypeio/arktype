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
} from "../../../compile/compile.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<"value", unknown> {
    serialized: string
}

const equalityCheck: Record<string, Function> = {
    default: (rule: unknown) => `${InputParameterName} === ${rule}`,
    date: (rule: Date) =>
        `${InputParameterName}.valueOf() === ${rule}.valueOf()`
}

export const valueNode = defineNodeKind<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compile: (rule, ctx) => {
            const compiledRule = compileSerializedValue(rule)
            return compileCheck(
                "value",
                rule,
                rule instanceof Date
                    ? equalityCheck["date"](compiledRule)
                    : equalityCheck["default"](compiledRule),
                ctx
            )
        }
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
