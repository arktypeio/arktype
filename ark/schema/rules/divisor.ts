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
	parse(input: def["input"] | def["definition"]): def["definition"]
	writeDefaultDescription(): string
}

export const defineNode =
	<def extends NodeDefinition>() =>
	<implementation extends NodeImplementation<def>>(
		implementation: implementation &
			ThisType<implementation & def["definition"]>
	) =>
		({}) as extend<implementation, def["definition"]>

const Divisor = defineNode<{
	input: number
	definition: DivisorDefinition
}>()({
	kind: "divisor",
	parse: (input: number | DivisorDefinition): DivisorDefinition =>
		typeof input === "number" ? { value: input } : input,
	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}
})

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
