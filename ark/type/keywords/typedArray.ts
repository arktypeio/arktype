import type { Constructor } from "@ark/util"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
export interface typedArrayExports {
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

export type typedArray = SchemaModule<typedArrayExports>

export const typedArray: typedArray = schemaScope(
	{
		Int8: Int8Array,
		Uint8: Uint8Array,
		Uint8Clamped: Uint8ClampedArray,
		Int16: Int16Array,
		Uint16: Uint16Array,
		Int32: Int32Array,
		Uint32: Uint32Array,
		Float32: Float32Array,
		Float64: Float64Array,
		BigInt64: BigInt64Array,
		BigUint64: BigUint64Array
	} satisfies {
		[k in keyof typedArrayExports]: Constructor<typedArrayExports[k]>
	},
	{ prereducedAliases: true }
).export()
