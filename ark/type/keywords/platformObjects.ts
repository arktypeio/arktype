import type { Module } from "../module.js"
import { scope } from "../scope.js"

// Platform APIs
// See https://developer.mozilla.org/en-US/docs/Web/API
// Must be implemented in Node etc. as well as the browser to include here
export interface platformObjectExports {
	ArrayBuffer: ArrayBuffer
	Blob: Blob
	File: File
	FormData: FormData
	Headers: Headers
	Request: Request
	Response: Response
	URL: URL
}

export type platformObjects = Module<platformObjectExports>

export const platformObjects: platformObjects = scope(
	{
		ArrayBuffer: ["instanceof", ArrayBuffer],
		Blob: ["instanceof", Blob],
		// support Node18
		File: ["instanceof", globalThis.File ?? Blob],
		FormData: ["instanceof", FormData],
		Headers: ["instanceof", Headers],
		Request: ["instanceof", Request],
		Response: ["instanceof", Response],
		URL: ["instanceof", URL]
	},
	{ prereducedAliases: true, ambient: true }
).export()
