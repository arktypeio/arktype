import type { Module, Submodule } from "../../module.ts"
import { scope } from "../../scope.ts"

const submodule: Module<arkObject.$> = scope(
	{
		// ECMAScript Objects
		Array: ["instanceof", Array],
		Date: ["instanceof", Date],
		Error: ["instanceof", Error],
		Function: ["instanceof", Function],
		Map: ["instanceof", Map],
		RegExp: ["instanceof", RegExp],
		Set: ["instanceof", Set],
		WeakMap: ["instanceof", WeakMap],
		WeakSet: ["instanceof", WeakSet],
		Promise: ["instanceof", Promise],

		// Platform APIs
		ArrayBuffer: ["instanceof", ArrayBuffer],
		Blob: ["instanceof", Blob],
		// support Node18
		File: ["instanceof", globalThis.File ?? Blob],
		FormData: ["instanceof", FormData],
		Headers: ["instanceof", Headers],
		Request: ["instanceof", Request],
		Response: ["instanceof", Response],
		URL: ["instanceof", URL],

		// TypedArrays
		Int8: ["instanceof", Int8Array],
		Uint8: ["instanceof", Uint8Array],
		Uint8Clamped: ["instanceof", Uint8ClampedArray],
		Int16: ["instanceof", Int16Array],
		Uint16: ["instanceof", Uint16Array],
		Int32: ["instanceof", Int32Array],
		Uint32: ["instanceof", Uint32Array],
		Float32: ["instanceof", Float32Array],
		Float64: ["instanceof", Float64Array],
		BigInt64: ["instanceof", BigInt64Array],
		BigUint64: ["instanceof", BigUint64Array]
	},
	{ prereducedAliases: true }
).export()

export const arkObject = {
	submodule
}

export declare namespace arkObject {
	// ECMAScript Objects
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
	export interface ecmascript {
		Array: Array<unknown>
		Date: Date
		Error: Error
		Function: Function
		Map: Map<unknown, unknown>
		RegExp: RegExp
		Set: Set<unknown>
		WeakMap: WeakMap<object, unknown>
		WeakSet: WeakSet<object>
		Promise: Promise<unknown>
	}

	// Platform APIs
	// See https://developer.mozilla.org/en-US/docs/Web/API
	// Must be implemented in Node etc. as well as the browser to include here
	export type platform = {
		ArrayBuffer: ArrayBuffer
		Blob: Blob
		File: File
		FormData: FormData
		Headers: Headers
		Request: Request
		Response: Response
		URL: URL
	}

	// TypedArrays
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
	export type typedArray = {
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

	interface $ extends ecmascript, platform, typedArray {
		$root: object
	}

	export type submodule = Submodule<$>
}
