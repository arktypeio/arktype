import type { Node } from "oxc-parser"
import type { SourceModule } from "./module.ts"

export type DynamicCode =
	| "parameter"
	| "opaque"
	| "validation"
	| "callback"
	// a value the build can't precompile yet, as no change to the program makes it static
	| "unsupported"

export class DynamicValue {
	module: SourceModule
	node: Node
	message: string
	cause: DynamicValue | undefined
	// nothing is known of a parameter or opaque value, so in a definition it may be a Standard Schema held as a hole
	isOpaque: boolean
	code: DynamicCode | undefined

	constructor(
		module: SourceModule,
		node: Node,
		message: string,
		cause?: DynamicValue,
		code?: DynamicCode
	) {
		this.module = module
		this.node = node
		this.message = message
		this.cause = cause
		this.code = code
		this.isOpaque =
			code === "parameter" || code === "opaque" || (cause?.isOpaque ?? false)
	}

	hasCode(code: DynamicCode): boolean {
		for (let link: DynamicValue | undefined = this; link; link = link.cause)
			if (link.code === code) return true
		return false
	}

	// the site needs the value to compute something else, so it cannot be held as a hole
	asOperand(): DynamicValue {
		if (!this.isOpaque) return this
		const result = new DynamicValue(
			this.module,
			this.node,
			this.message,
			this.cause,
			this.code
		)
		result.isOpaque = false
		return result
	}
}
