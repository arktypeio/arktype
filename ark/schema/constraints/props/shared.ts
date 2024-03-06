import { compileSerializedValue, reference } from "@arktype/util"

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
