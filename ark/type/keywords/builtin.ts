import { genericNode, intrinsic } from "@ark/schema"
import type * as util from "@ark/util"
import { Hkt, type Key } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { submodule } from "./utils.ts"

class MergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>
}

const Merge = genericNode(
	["base", intrinsic.object],
	["props", intrinsic.object]
)(args => args.base.merge(args.props), MergeHkt)

export const arkBuiltin: Module<arkBuiltin> = submodule({
	Key: intrinsic.key,
	Merge
})

export type arkBuiltin = Submodule<{
	Key: Key
	Merge: typeof Merge.t
}>
