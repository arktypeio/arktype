import {
	genericNode,
	intrinsic,
	rootSchema,
	type GenericAst
} from "@ark/schema"
import { Hkt, liftArray, type array, type Digit } from "@ark/util"
import type { To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"

// as at runtime, an element that's an array isn't lifted, and the others are
// lifted together, so a union's branches can be mixed in one array
export class LiftFromHkt extends Hkt<[element: unknown]> {
	declare body: Exclude<this[0], array> extends infer element ?
		(In: element | element[]) => To<element[]>
	:	never
}

const liftFrom = () =>
	genericNode("element")(args => {
		const nonArrayElement = args.element.exclude(intrinsic.Array)
		const lifted = nonArrayElement.array()
		return nonArrayElement
			.rawOr(lifted)
			.pipe(liftArray)
			.distribute(
				branch => branch.assertIs("morph").declareOut(lifted),
				rootSchema
			)
	}, LiftFromHkt)

export const arkArray: arkArray.module = keywordModule(
	{
		root: () => intrinsic.Array,
		readonly: "root",
		index: () => intrinsic.nonNegativeIntegerString,
		liftFrom
	},
	{
		name: "Array"
	}
) as never

// unexported, so emitted declarations write it out: see Submodule
type arkArray$ = {
	root: unknown[]
	readonly: readonly unknown[]
	index: NonNegativeIntegerString
	liftFrom: GenericAst<readonly [["element", unknown]], LiftFromHkt, {}, {}>
}

export declare namespace arkArray {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = arkArray$
}

// unexported, so a declaration writing arkArray$ out writes this out with it
type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)
