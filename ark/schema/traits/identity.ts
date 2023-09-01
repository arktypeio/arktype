import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"

export interface Identity extends BaseConstraint<unknown> {}

export const identity = constraint<Identity>(() => [])({
	kind: "identity",
	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}
})
