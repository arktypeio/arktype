import { domainOf, prototypeKeysOf, stringify } from "@arktype/util"
import { compileSerializedValue, In } from "../../compiler/compile.js"
import { Constraint } from "./constraint.js"

// TODO: fix unknown disambiguation
export class UnitNode extends Constraint<unknown> {
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

	writeDefaultDescription() {
		return stringify(this.rule)
	}
}
