import { type BaseConstraint, constraint } from "./constraint.js"

export interface PropConstraint extends BaseConstraint<number> {}

export const prop = constraint<PropConstraint>((l, r) => [l, r])({
	kind: "prop",
	writeDefaultDescription: () => "a prop"
})
