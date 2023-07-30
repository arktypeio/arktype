import type { BaseAttributes, BaseConstraints } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "./constraint.js"

export interface DivisorConstraints extends BaseConstraints {
	readonly value: number
}

export class DivisorNode extends BaseNode<
	typeof DivisorNode,
	DivisorConstraints,
	BaseAttributes
> {
	static writeDefaultDescription(constraints: DivisorConstraints) {
		return constraints.value === 1
			? "an integer"
			: `a multiple of ${constraints.value}`
	}

	static intersectConstraints(l: DivisorConstraints, r: DivisorConstraints) {
		return {
			value: Math.abs(
				(this.value * other.value) /
					greatestCommonDivisor(this.value, other.value)
			)
		}
	}
}

export const DivisorSet = ConstraintSet<readonly DivisorNode[]>

export type DivisorSet = InstanceType<typeof DivisorSet>

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
	let previous: number
	let greatestCommonDivisor = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonDivisor % current
		greatestCommonDivisor = previous
	}
	return greatestCommonDivisor
}
