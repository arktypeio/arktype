import {
	genericNode,
	intrinsic,
	type BaseRoot,
	type GenericRoot
} from "@ark/schema"
import type * as util from "@ark/util"
import { cached, Hkt, type Key, type Thunk } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"

class MergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>

	description =
		'merge an object\'s properties onto another like `Merge(User, { isAdmin: "true" })`'
}

const Merge = cached(() =>
	genericNode(["base", intrinsic.object], ["props", intrinsic.object])(
		args => args.base.merge(args.props),
		MergeHkt
	)
)

export const builtinDefinitions: Record<
	keyof arkBuiltins.$,
	Thunk<BaseRoot | GenericRoot>
> = {
	Key: () => intrinsic.key,
	Merge
}

export const arkBuiltins: arkBuiltins = keywordModule(
	builtinDefinitions
) as never

export type arkBuiltins = Module<arkBuiltins.$>

export declare namespace arkBuiltins {
	export type submodule = Submodule<$>

	export type $ = {
		Key: Key
		Merge: ReturnType<typeof Merge>["t"]
	}
}
