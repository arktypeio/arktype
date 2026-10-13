import { flatMorph, typedArrayConstructors } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"

export const TypedArray: TypedArray.module = keywordModule(
	flatMorph(typedArrayConstructors, (k, constructor) => [
		k.slice(0, -"Array".length),
		["instanceof", constructor]
	]),
	{
		name: "TypedArray"
	}
) as never

export declare namespace TypedArray {
	export type module = Module<TypedArray.$>

	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
	export type submodule = Submodule<$>

	export type $ = {
		Int8: Int8Array
		Uint8: Uint8Array
		Uint8Clamped: Uint8ClampedArray
		Int16: Int16Array
		Uint16: Uint16Array
		Int32: Int32Array
		Uint32: Uint32Array
		Float32: Float32Array
		Float64: Float64Array
		BigInt64: BigInt64Array
		BigUint64: BigUint64Array
	}
}
