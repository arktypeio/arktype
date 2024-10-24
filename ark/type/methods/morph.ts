import type { inferPipe } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { BaseType } from "./base.ts"

// t can't be constrained to MorphAst here because it could be a union including some
// non-morph branches
/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	/**
	 * Append extra validation shape on the pipe output
	 * @example type({codes: 'string.numeric[]'}).pipe(obj => obj.codes).to('string.numeric.parse[]')
	 */
	to<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): Type<inferPipe<t, r>, $>
}

export type { Type as MorphType }
