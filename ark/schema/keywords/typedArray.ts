import type { Constructor } from "@ark/util"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
export interface typedArrayExports {
	Int8Array: Int8Array
	Uint8Array: Uint8Array
	Uint8ClampedArray: Uint8ClampedArray
	Int16Array: Int16Array
	Uint16Array: Uint16Array
	Int32Array: Int32Array
	Uint32Array: Uint32Array
	Float32Array: Float32Array
	Float64Array: Float64Array
	BigInt64Array: BigInt64Array
	BigUint64Array: BigUint64Array
}

export type typedArray = SchemaModule<typedArrayExports>

export const typedArray: typedArray = schemaScope(
	{
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
		BigInt64Array,
		BigUint64Array
	} satisfies {
		[k in keyof typedArrayExports]: Constructor<typedArrayExports[k]>
	},
	{ prereducedAliases: true }
).export()
