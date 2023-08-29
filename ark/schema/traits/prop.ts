import { type BaseConstraint, constraint } from "./constraint.js"

export interface PropConstraint extends BaseConstraint<number> {}

// export type PropConstraint = {
//     key: string | symbol
//     required: boolean
//     value: Type
// }

// export type SignatureConstraint = defineConstraint<{
//     kind: "signature"
//     key: Type
//     value: Type
// }>

export const prop = constraint<PropConstraint>((l, r) => [l, r])({
	kind: "prop",
	writeDefaultDescription: () => "a prop"
})
