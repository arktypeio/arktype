import { registry } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import { arkArray } from "./Array.ts"
import { arkFormData } from "./FormData.ts"
import { TypedArray } from "./TypedArray.ts"

export const arkPrototypes: arkPrototypes.module = submodule({
	// ECMAScript Objects
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
	Array: arkArray,
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
	File: ["instanceof", registry.FileConstructor],
	FormData: arkFormData,
	Headers: ["instanceof", Headers],
	Request: ["instanceof", Request],
	Response: ["instanceof", Response],
	URL: ["instanceof", URL]
})

export declare namespace arkPrototypes {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export interface keywords extends ecmascript, platform {}

	interface $ extends Omit<keywords, keyof wrapped>, wrapped {}

	export interface wrapped {
		Array: arkArray.submodule
		TypedArray: TypedArray.submodule
		FormData: arkFormData.submodule
	}

	export interface deepResolutions
		extends arkArray.deepResolutions,
			TypedArray.deepResolutions,
			arkFormData.deepResolutions {}

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
		FormData: FormData
		Headers: Headers
		Request: Request
		Response: Response
		URL: URL
	}

	export interface instances extends ecmascript, platform {}

	export type instanceOf<name extends keyof instances = keyof instances> =
		instances[name]

	export type instanceOfExcluding<
		name extends keyof instances = keyof instances
	> = instances[Exclude<keyof instances, name>]
}
