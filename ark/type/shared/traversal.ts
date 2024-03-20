import { literalPropAccess } from "@arktype/util"
import type { ResolvedArkConfig } from "../scope.js"
import { ArkErrors, type ArkErrorInput } from "./errors.js"

export type TraversalPath = PropertyKey[]

export const pathToPropString = (path: TraversalPath): string => {
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
		public config: ResolvedArkConfig
	) {
		this.errorsStack = [new ArkErrors(this)]
	}

	get currentErrors(): ArkErrors {
		return this.errorsStack.at(-1)!
	}

	get error(): ArkErrors["add"] {
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
