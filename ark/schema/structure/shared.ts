import { registeredReference } from "@arktype/util"

export const arrayIndexMatcher: RegExp = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference: `$ark.${string}` =
	registeredReference(arrayIndexMatcher)
