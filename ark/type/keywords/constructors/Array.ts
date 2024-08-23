import { genericNode, intrinsic } from "@ark/schema"
import { Hkt, liftArray, type Digit } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { Out } from "../ast.ts"
import { submodule } from "../utils.ts"

class liftFromHkt extends Hkt<[element: unknown]> {
	declare body: liftArray<this[0]> extends infer lifted ?
		(In: this[0] | lifted) => Out<lifted>
	:	never
}

const liftFrom = genericNode("element")(
	args => args.element.or(args.element.array()).pipe(liftArray),
	liftFromHkt
)

export const ArrayModule: Module<ArrayModule> = submodule({
	$root: intrinsic.Array,
	readonly: "$root",
	index: intrinsic.nonNegativeIntegerString,
	liftFrom
})

export type ArrayModule = Submodule<{
	$root: unknown[]
	readonly: readonly unknown[]
	index: NonNegativeIntegerString
	liftFrom: typeof liftFrom.t
}>

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)
