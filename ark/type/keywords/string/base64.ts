import type { Predicate, of } from "../inference.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type base64 = of<string, Predicate<"base64">>
	export type base64url = of<string, Predicate<"base64url">>
}

// https://stackoverflow.com/a/475217/1255873
export const base64 = regexStringNode(
	/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
	"alphanumeric characters and +/ with the correct amount of = padding"
)
export const base64url = regexStringNode(
	/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==|%3D%3D)?|[A-Za-z0-9_-]{3}(?:=|%3D)?)?$/,
	"alphanumeric characters and _- optionally with the correct amount of = or %3D padding"
)

export type base64 = string.base64
export type base64url = string.base64url
