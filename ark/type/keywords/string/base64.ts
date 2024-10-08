import type { Module, Submodule } from "../../module.ts"
import type { Predicate, of } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

export const base64 = arkModule({
	root: regexStringNode(
		/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
		"base64-encoded"
	),
	url: regexStringNode(
		/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==|%3D%3D)?|[A-Za-z0-9_-]{3}(?:=|%3D)?)?$/,
		"base64url-encoded"
	)
})

declare namespace string {
	export type base64 = of<string, Predicate<"base64">>

	export namespace base64 {
		export type url = of<string, Predicate<"base64.url">>
	}
}

export declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string.base64
		url: string.base64.url
	}
}
