import { compileSerializedValue } from "../../../compile/compile.js"
import { domainOf } from "../../../utils/domains.js"
import { prototypeKeysOf } from "../../../utils/objectKinds.js"
import { stringify } from "../../../utils/serialize.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<unknown> {}

export const valueNode = defineNodeKind<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compile: (rule, s) =>
            s.check(
                "value",
                rule,
                `${s.data} === ${compileSerializedValue(rule)}`
            )
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
