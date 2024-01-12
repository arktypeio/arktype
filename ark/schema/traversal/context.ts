import type { autocomplete } from "@arktype/util"
import type { ParsedArkConfig } from "../scope.js"
import { ArkErrors, type ArkErrorCode, type ArkErrorInput } from "./errors.js"

export type TraversalPath = (string | symbol)[]

export class TraversalContext {
	path: TraversalPath = []
	errorsStack: ArkErrors[] = [new ArkErrors(this)]
	// TODO: add morphs here
	entriesToPrune: [data: Record<string, unknown>, key: string][] = []

	// Qualified
	seen: { [name in string]?: object[] } = {}

	constructor(
		public data: unknown,
		public config: ParsedArkConfig
	) {}

	get currentErrors() {
		return this.errorsStack.at(-1)!
	}

	get error() {
		return this.currentErrors.add
	}

	falsify(input: ArkErrorInput): false {
		this.error(input)
		return false
	}

	pushUnion() {
		this.errorsStack.push(new ArkErrors(this))
	}

	popUnion(branchCount: number, data: unknown, path: string[]) {
		const branchProblems = this.errorsStack.pop()!
		if (branchProblems.count === branchCount) {
			// this.addError("union", { data: this.data, errors: branchProblems })
		}
	}
}
