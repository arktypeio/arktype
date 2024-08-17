import * as util from "@ark/util"
import { Hkt, type Digit, type Key } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
// these are needed to create some internal types
import { genericNode, intrinsic } from "@ark/schema"
import type { Out } from "../ast.js"
import "./ts.js"

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

const keywords: Module<arkBuiltin.keywords> = scope({
	key: intrinsic.key,
	nonNegativeIntegerString: intrinsic.nonNegativeIntegerString,
	liftArray,
	merge
}).export()

export const arkBuiltin = {
	keywords
}

export declare namespace arkBuiltin {
	export interface keywords {
		key: Key
		nonNegativeIntegerString: NonNegativeIntegerString
		liftArray: typeof liftArray.t
		merge: typeof merge.t
	}
}
