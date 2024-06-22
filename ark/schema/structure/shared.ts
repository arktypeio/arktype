import { registeredReference } from "@arktype/util"

export const arrayIndexSource = `^(?:0|[1-9]\\d*)$`

export const arrayIndexMatcher = new RegExp(arrayIndexSource)

export const arrayIndexMatcherReference: `$ark.${string}` =
	registeredReference(arrayIndexMatcher)
