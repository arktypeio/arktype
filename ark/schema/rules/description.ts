import type { Base, BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export interface DescriptionDefinition extends BaseDefinition {
	readonly value: string
}

export class DescriptionNode extends RuleNode<DescriptionDefinition> {
	readonly kind = "description"

	writeDefaultDescription() {
		return this.value
	}

	protected reduceRules(other: DescriptionNode) {
		return null
	}
}

const Describable = <base extends Base<object>>(base: base) => {
	abstract class Describable extends base {
		readonly description?: DescriptionNode

		constructor(...args: any[]) {
			super(...args)
			this.description = args[0]?.description
		}

		toString() {
			return this.description?.toString() ?? this.writeDefaultDescription()
		}

		abstract writeDefaultDescription(): string
	}
	return Describable
}
