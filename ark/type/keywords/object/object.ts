import { intrinsic } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import { formData } from "./formData.ts"
import { TypedArray } from "./typedArray.ts"

export const object: Module<object.$> = submodule({
	$root: intrinsic.object,
	// ECMAScript Objects
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
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
	TypedArray,

	// Platform APIs
	// See https://developer.mozilla.org/en-US/docs/Web/API
	// Must be implemented in Node etc. as well as the browser to include here
	ArrayBuffer: ["instanceof", ArrayBuffer],
	Blob: ["instanceof", Blob],
	// support Node18
	File: ["instanceof", globalThis.File ?? Blob],
	formData,
	Headers: ["instanceof", Headers],
	Request: ["instanceof", Request],
	Response: ["instanceof", Response],
	URL: ["instanceof", URL]
})

export declare namespace object {
	export type submodule = Submodule<$>

	interface $ extends ecmascript, platform {
		$root: object
		TypedArray: TypedArray
	}

	export type ecmascript = {
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

	export type platform = {
		ArrayBuffer: ArrayBuffer
		Blob: Blob
		File: File
		FormData: formData
		Headers: Headers
		Request: Request
		Response: Response
		URL: URL
	}
}
