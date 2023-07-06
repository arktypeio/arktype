import { domainOf, prototypeKeysOf, stringify } from "@arktype/utils"
import { compileSerializedValue, In } from "../../compiler/compile.js"
import type { DateLiteral } from "../../parser/string/shift/operand/date.js"
import { extractDateLiteralSource } from "../../parser/string/shift/operand/date.js"
import { BasisNodeBase } from "./basis.js"

export class UnitNode extends BasisNodeBase<
    unknown,
    { parsedFrom?: DateLiteral }
> {
    readonly kind = "unit"
    readonly literalKeys =
        this.rule === null || this.rule === undefined
            ? []
            : [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
    readonly serialized = compileSerializedValue(this.rule)
    readonly domain = domainOf(this.rule)

    compile() {
        return this.rule instanceof Date
            ? `${In}.valueOf() === ${this.rule.valueOf()}`
            : `${In} === ${this.serialized}`
    }

    describe() {
        return this.meta.parsedFrom
            ? extractDateLiteralSource(this.meta.parsedFrom)
            : stringify(this.rule)
    }
}
