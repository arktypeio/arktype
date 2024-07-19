import {
	registeredReference,
	type RegisteredReference
} from "../shared/registry.js"

export const arrayIndexSource = `^(?:0|[1-9]\\d*)$`

export const arrayIndexMatcher = new RegExp(arrayIndexSource)

export const arrayIndexMatcherReference: RegisteredReference =
	registeredReference(arrayIndexMatcher)
