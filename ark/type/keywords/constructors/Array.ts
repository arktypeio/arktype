import { genericNode, intrinsic, rootNode } from "@ark/schema"
import { Hkt, liftArray, type Digit } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { To } from "../ast.ts"
import { submodule } from "../utils.ts"

class liftFromHkt extends Hkt<[element: unknown]> {
	declare body: liftArray<this[0]> extends infer lifted ?
		(In: this[0] | lifted) => To<lifted>
	:	never
}

const liftFrom = genericNode("element")(args => {
	const nonArrayElement = args.element.exclude(intrinsic.Array)
	const lifted = nonArrayElement.array()
	return nonArrayElement
		.or(lifted)
		.pipe(liftArray)
		.distribute(
			branch => branch.assertHasKind("morph").declareOut(lifted),
			rootNode
		)
}, liftFromHkt)

export const arkArray: arkArray.module = submodule({
	root: intrinsic.Array,
	readonly: "root",
	index: intrinsic.nonNegativeIntegerString,
	liftFrom
})

export declare namespace arkArray {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: unknown[]
		readonly: readonly unknown[]
		index: NonNegativeIntegerString
		liftFrom: typeof liftFrom.t
	}
}

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)
