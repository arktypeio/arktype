import type { Constructor } from "@ark/util"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

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

export type platformObjects = SchemaModule<platformObjectExports>

export const platformObjects: platformObjects = schemaScope(
	{
		ArrayBuffer,
		Blob,
		File,
		FormData,
		Headers,
		Request,
		Response,
		URL
	} satisfies {
		[k in keyof platformObjectExports]: Constructor<platformObjectExports[k]>
	},
	{ prereducedAliases: true }
).export()
