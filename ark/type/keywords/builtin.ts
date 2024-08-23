import { genericNode, intrinsic } from "@ark/schema"
import type * as util from "@ark/util"
import { Hkt, type Key } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { submodule } from "./utils.ts"

class mergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>
}

const merge = genericNode(
	["base", intrinsic.object],
	["props", intrinsic.object]
)(args => args.base.merge(args.props), mergeHkt)

export const arkBuiltin: Module<arkBuiltin> = submodule({
	key: intrinsic.key,
	merge
})

export type arkBuiltin = Submodule<{
	key: Key
	merge: typeof merge.t
}>
