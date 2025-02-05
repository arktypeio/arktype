import { genericNode, intrinsic } from "@ark/schema"
import type * as util from "@ark/util"
import { Hkt, type Key } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { Scope } from "../scope.ts"

class MergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>
}

const Merge = genericNode(
	["base", intrinsic.object],
	["props", intrinsic.object]
)(args => args.base.merge(args.props), MergeHkt)

export const arkBuiltins: arkBuiltins = Scope.module({
	Key: intrinsic.key,
	Merge
})

export type arkBuiltins = Module<arkBuiltins.$>

export declare namespace arkBuiltins {
	export type submodule = Submodule<$>

	export type $ = {
		Key: Key
		Merge: typeof Merge.t
	}
}
