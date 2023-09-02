import { stringify } from "@arktype/util"
import { compileSerializedValue } from "../io/compile.js"
import { composeConstraint } from "./constraint.js"

export class Identity extends composeConstraint<unknown>(() => []) {
	readonly kind = "identity"

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}
}
