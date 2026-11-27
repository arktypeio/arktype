export const arrayIndexSource = `^(?:0|[1-9]\\d*)$`

export const arrayIndexMatcher = /* @__PURE__ */ new RegExp(arrayIndexSource)

// 2 ** 32 - 1; larger integer keys are properties, not indices
export const maxArrayLength = 4294967295

/**
 * a key of an array as a path names it: an index by its number, as its
 * elements are, so an index signature's error on one is at the same path
 */
export const arrayPathKeyOf = (k: PropertyKey): PropertyKey =>
	typeof k === "string" && arrayIndexMatcher.test(k) && +k < maxArrayLength ?
		+k
	:	k
