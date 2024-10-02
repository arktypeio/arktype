import { rootSchema, type TraversalContext } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Predicate, To, of } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

// Using JS-only solution to parse Base64 as `Buffer.from` isn't available in browsers and `btoa` is
// notoriously slow.
//
// Code adapted from base64-js: https://github.com/feross/base64-js/blob/master/index.js

const lookup =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("")
const revLookup = lookup.reduce(
	(obj, char, i) => {
		obj[char.charCodeAt(0)] = i
		return obj
	},
	{} as Record<number, number>
)

const getLens = (b64: string) => {
	const len = b64.length

	if (len % 4 > 0)
		throw new SyntaxError("Invalid string. Length must be a multiple of 4")

	// Trim off extra bytes after placeholder bytes are found
	// See: https://github.com/beatgammit/base64-js/issues/42
	let validLen = b64.indexOf("=")
	if (validLen === -1) validLen = len

	const placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4)

	return [validLen, placeHoldersLen]
}

const byteLength = (validLen: number, placeHoldersLen: number) =>
	((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen

const parseB64 = (b64: string) => {
	const [validLen, placeHoldersLen] = getLens(b64)
	const arr = new Uint8Array(byteLength(validLen, placeHoldersLen))

	// if there are placeholders, only get up to the last complete 4 chars
	const len = placeHoldersLen > 0 ? validLen - 4 : validLen

	let tmp: number
	let curByte = 0

	let i: number
	for (i = 0; i < len; i += 4) {
		tmp =
			(revLookup[b64.charCodeAt(i)] << 18) |
			(revLookup[b64.charCodeAt(i + 1)] << 12) |
			(revLookup[b64.charCodeAt(i + 2)] << 6) |
			revLookup[b64.charCodeAt(i + 3)]
		arr[curByte++] = (tmp >> 16) & 0xff
		arr[curByte++] = (tmp >> 8) & 0xff
		arr[curByte++] = tmp & 0xff
	}

	if (placeHoldersLen === 2) {
		tmp =
			(revLookup[b64.charCodeAt(i)] << 2) |
			(revLookup[b64.charCodeAt(i + 1)] >> 4)
		arr[curByte++] = tmp & 0xff
	}

	if (placeHoldersLen === 1) {
		tmp =
			(revLookup[b64.charCodeAt(i)] << 10) |
			(revLookup[b64.charCodeAt(i + 1)] << 4) |
			(revLookup[b64.charCodeAt(i + 2)] >> 2)
		arr[curByte++] = (tmp >> 8) & 0xff
		arr[curByte++] = tmp & 0xff
	}

	return arr
}

const base64Description = "base64-encoded"
const base64UrlDescription = "base64url-encoded"

export const writeBase64SyntaxErrorProblem = (error: unknown): string => {
	if (!(error instanceof SyntaxError)) throw error
	return `must be ${base64Description} (${error})`
}

const base64Pattern =
	/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const base64UrlPattern =
	/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==|%3D%3D)?|[A-Za-z0-9_-]{3}(?:=|%3D)?)?$/

export const base64 = arkModule({
	root: regexStringNode(base64Pattern, base64Description),
	url: regexStringNode(base64UrlPattern, base64UrlDescription),
	parse: rootSchema({
		in: "string",
		declaredOut: rootSchema(Uint8Array),
		morphs: (s: string, ctx: TraversalContext) => {
			if (s.length === 0) return new Uint8Array(0)

			try {
				return parseB64(s)
			} catch (e) {
				return ctx.error({
					code: "predicate",
					expected: base64Description,
					problem: writeBase64SyntaxErrorProblem(e)
				})
			}
		}
	})
})

declare namespace string {
	export type base64 = of<string, Predicate<"base64">>

	export namespace base64 {
		export type url = of<string, Predicate<"base64.url">>
		export type parse = of<string, Predicate<"base64.parse">>
	}
}

export declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string.base64
		url: string.base64.url
		parse: (In: string.base64) => To<Uint8Array>
	}
}
