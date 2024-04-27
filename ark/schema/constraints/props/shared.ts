import { registeredReference } from "@arktype/util"

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = registeredReference(arrayIndexMatcher)
