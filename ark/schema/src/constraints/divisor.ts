import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"

export interface DivisorRule extends BaseRule {
	readonly value: number
}

export class DivisorNode extends BaseNode<DivisorRule, typeof DivisorNode> {
	static writeDefaultDescription(def: DivisorRule) {
		return def.value === 1 ? "an integer" : `a multiple of ${def.value}`
	}

	intersectOwnKeys(other: DivisorNode) {
		return {
			value: Math.abs(
				(this.value * other.value) /
					greatestCommonDivisor(this.value, other.value)
			)
		}
	}
}

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
