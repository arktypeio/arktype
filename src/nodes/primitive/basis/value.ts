import {
    cached,
    domainOf,
    prototypeKeysOf,
    stringify
} from "../../../../dev/utils/src/main.js"
import { compileSerializedValue } from "../../../compile/state.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<unknown> {
    serialized: string
}

const equalityCheck: Record<string, Function> = {
    default: (rule: unknown, data: string) => `${data} === ${rule}`,
    date: (rule: Date, date: Date) => `${date}.valueOf() === ${rule}`
}

export const valueNode = defineNodeKind<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compile: (rule, s) => {
            const compiledRule = compileSerializedValue(rule)
            return s.check(
                "value",
                rule,
                typeof rule === "string"
                    ? equalityCheck["date"](compiledRule, s.data)
                    : equalityCheck["default"](compiledRule, s.data)
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
