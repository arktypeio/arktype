import type { Module, Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import { TypedArray } from "./typedArray.ts"

export const arkObject: Module<arkObject.$> = submodule({
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

	TypedArray
})

export type arkObject = arkObject.submodule

export declare namespace arkObject {
	interface $ extends ecmascript, platform {
		$root: object
		TypedArray: TypedArray
	}

	export type submodule = Submodule<$>

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
}
