import type { Node } from "oxc-parser"
import type { SourceModule } from "./module.ts"

export type DynamicCode =
	| "parameter"
	| "opaque"
	| "validation"
	| "callback"
	// a value no change to the program could make static
	| "unsupported"

export class DynamicValue {
	module: SourceModule
	node: Node
	message: string
	cause: DynamicValue | undefined
	// may be a Standard Schema held as a hole
	isOpaque: boolean
	code: DynamicCode | undefined

	constructor(
		module: SourceModule,
		node: Node,
		message: string,
		cause?: DynamicValue,
		code?: DynamicCode,
		isOpaque = code === "parameter" || code === "opaque" || !!cause?.isOpaque
	) {
		this.module = module
		this.node = node
		this.message = message
		this.cause = cause
		this.code = code
		this.isOpaque = isOpaque
	}

	hasCode(code: DynamicCode): boolean {
		for (let link: DynamicValue | undefined = this; link; link = link.cause)
			if (link.code === code) return true
		return false
	}

	// a value the site computes with can't be held as a hole
	asOperand(): DynamicValue {
		return this.isOpaque ?
				new DynamicValue(
					this.module,
					this.node,
					this.message,
					this.cause,
					this.code,
					false
				)
			:	this
	}
}

export const chainOf = (dynamic: DynamicValue): string[] => {
	const result: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause)
		result.push(link.message)
	return result
}
