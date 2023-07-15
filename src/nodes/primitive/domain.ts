import type { Domain } from "@arktype/utils"
import { getBaseDomainKeys } from "@arktype/utils"
import { In } from "../../compiler/compile.js"
import type { Node } from "../kinds.js"
import type { BasisKind } from "./basis.js"
import { BasisNodeBase } from "./basis.js"

export type NonEnumerableDomain = Exclude<
	Domain,
	"null" | "undefined" | "boolean"
>

export class DomainNode extends BasisNodeBase<{
	rule: NonEnumerableDomain
	intersection: Node<BasisKind>
	meta: {}
}> {
	readonly kind = "domain"
	readonly literalKeys = getBaseDomainKeys(this.rule)
	readonly domain = this.rule

	compile() {
		return this.rule === "object"
			? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
			: `typeof ${In} === "${this.rule}"`
	}

	describe() {
		return domainDescriptions[this.rule]
	}
}

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
	bigint: "a bigint",
	boolean: "boolean",
	null: "null",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol",
	undefined: "undefined"
} as const satisfies Record<Domain, string>
