import type { AbstractableConstructor } from "@arktype/utils"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	prototypeKeysOf
} from "@arktype/utils"
import { In } from "../../compiler/compile.js"
import { registry } from "../../compiler/registry.js"
import type { Node } from "../kinds.js"
import type { BasisKind } from "./basis.js"
import { BasisNodeBase } from "./basis.js"

export class ClassNode extends BasisNodeBase<{
	rule: AbstractableConstructor
	intersection: Node<BasisKind>
	meta: {}
}> {
	readonly kind = "class"
	readonly literalKeys = prototypeKeysOf(this.rule.prototype)
	readonly domain = "object"

	compile() {
		return `${In} instanceof ${
			getExactBuiltinConstructorName(this.rule) ??
			registry().register(this.rule)
		}`
	}

	describe() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule.name}`
	}

	extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
		return baseConstructors.some((ctor) => constructorExtends(this.rule, ctor))
	}
}
