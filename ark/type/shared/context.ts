import { literalPropAccess } from "@arktype/util"
import { ArkErrors, type ArkErrorInput } from "./errors.js"
import type { ParsedArkConfig } from "../schemaScope.js"

export type TraversalPath = (string | symbol)[]

export const pathToPropString = (path: TraversalPath) => {
	const propAccessChain = path.reduce<string>(
		(s, segment) => s + literalPropAccess(segment),
		""
	)
	return propAccessChain[0] === "." ? propAccessChain.slice(1) : propAccessChain
}

export class TraversalContext {
	path: TraversalPath = []
	errorsStack: ArkErrors[]
	// TODO: add morphs here
	entriesToPrune: [data: Record<string, unknown>, key: string][] = []

	// Qualified
	seen: { [name in string]?: object[] } = {}

	constructor(
		public root: unknown,
		public config: ParsedArkConfig
	) {
		this.errorsStack = [new ArkErrors(this)]
	}

	get currentErrors() {
		return this.errorsStack.at(-1)!
	}

	get error() {
		return this.currentErrors.add.bind(this.currentErrors)
	}

	get data(): unknown {
		let result: any = this.root
		for (const segment of this.path) {
			result = result?.[segment]
		}
		return result
	}

	invalid(input: ArkErrorInput): false {
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

export type TraversalMethodsByKind<input = unknown> = {
	Allows: TraverseAllows<input>
	Apply: TraverseApply<input>
}

export type TraversalKind = keyof TraversalMethodsByKind

export type TraverseAllows<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => boolean
export type TraverseApply<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => void
