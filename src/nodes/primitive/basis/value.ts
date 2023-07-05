import { cached, domainOf, prototypeKeysOf, stringify } from "@arktype/utils"
import {
    compileSerializedValue,
    InputParameterName
} from "../../../compile/compile.js"
import { node } from "../../../main.js"
import type { DateLiteral } from "../../../parse/string/shift/operand/date.js"
import { extractDateLiteralSource } from "../../../parse/string/shift/operand/date.js"
import type { BaseNodeMeta } from "../../node.js"
import { defineNode } from "../../node.js"
import type { BasisNode, defineBasis } from "./basis.js"

export interface ValueMeta extends BaseNodeMeta {
    parsedFrom?: DateLiteral
}

export type ValueConfig = defineBasis<{
    kind: "value"
    rule: unknown
    meta: ValueMeta
}>

export interface ValueNode extends BasisNode<ValueConfig> {
    serialized: string
}

export const valueNode = defineNode<ValueNode>(
    {
        kind: "value",
        compile: (rule) =>
            rule instanceof Date
                ? `${InputParameterName}.valueOf() === ${rule.valueOf()}`
                : `${InputParameterName} === ${compileSerializedValue(rule)}`
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
            description: base.meta.parsedFrom
                ? extractDateLiteralSource(base.meta.parsedFrom)
                : stringify(base.rule)
        }
    }
)
