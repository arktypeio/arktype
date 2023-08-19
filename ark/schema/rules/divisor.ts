import type { Dict, evaluate, extend } from "@arktype/util"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export type DivisorDefinition = extend<
	BaseDefinition,
	{
		readonly value: number
	}
>

export type NodeDefinition = {
	input: unknown
	definition: Dict<string, unknown>
}

export interface NodeImplementation<def extends NodeDefinition> {
	kind: string
	writeDefaultDescription(): string
}

export const defineNode =
	<def extends NodeDefinition>(
		parse: (input: def["input"] | def["definition"]) => def["definition"]
	) =>
	<implementation extends NodeImplementation<def>>(
		implementation: implementation &
			ThisType<implementation & def["definition"]>
	) =>
	(input: def["input"] | def["definition"]) =>
		({}) as extend<implementation, def["definition"]>

const Divisor = defineNode<{
	input: number
	definition: DivisorDefinition
}>((input) => (typeof input === "number" ? { value: input } : input))({
	kind: "divisor",
	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}
})

const z = Divisor(5)

export class DivisorNode extends RuleNode<DivisorDefinition> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}

	protected reduceRules(other: DivisorNode) {
		return {
			value:
				(this.value * other.value) /
				greatestCommonDivisor(this.value, other.value)
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

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`
