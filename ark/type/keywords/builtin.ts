import * as util from "@ark/util"
import { Hkt, type Digit, type Key } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
// these are needed to create some internal types
import { genericNode, intrinsic } from "@ark/schema"
import type { Out } from "./ast.ts"
import "./ts.ts"
import { submodule } from "./utils.ts"

class liftArrayHkt extends Hkt<[element: unknown]> {
	declare body: util.liftArray<this[0]> extends infer lifted ?
		(In: this[0] | lifted) => Out<lifted>
	:	never
}

const liftArray = genericNode("element")(
	args => args.element.or(args.element.array()).pipe(util.liftArray),
	liftArrayHkt
)

class mergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>
}

const merge = genericNode(
	["base", intrinsic.object],
	["props", intrinsic.object]
)(args => args.base.merge(args.props), mergeHkt)

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)

export const arkBuiltin: Module<arkBuiltin> = submodule({
	key: intrinsic.key,
	nonNegativeIntegerString: intrinsic.nonNegativeIntegerString,
	liftArray,
	merge
})

export type arkBuiltin = Submodule<{
	key: Key
	nonNegativeIntegerString: NonNegativeIntegerString
	liftArray: typeof liftArray.t
	merge: typeof merge.t
}>
