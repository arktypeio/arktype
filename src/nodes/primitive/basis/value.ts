import { compileSerializedValue } from "../../../compile/compile.js"
import { domainOf } from "../../../utils/domains.js"
import { prototypeKeysOf } from "../../../utils/objectKinds.js"
import { stringify } from "../../../utils/serialize.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<unknown> {}

const compareFunction: Record<string, Function> = {
    default: (rule: unknown, data: string) => `${data} === ${rule}`,
    date: (rule: Date, data: Date) => `${data}.toDateString() === ${rule}`
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
                rule instanceof Date
                    ? compareFunction["date"](compiledRule, s.data)
                    : compareFunction["default"](compiledRule, s.data)
            )
        }
    },
    (base) => ({
        domain: domainOf(base.rule),
        literalKeys:
            base.rule === null || base.rule === undefined
                ? []
                : [...prototypeKeysOf(base.rule), ...Object.keys(base.rule)],
        description: `the value ${stringify(base.rule)}`
    })
)
