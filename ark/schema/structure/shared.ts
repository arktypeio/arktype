export const arrayIndexSource = `^(?:0|[1-9]\\d*)$`

export const arrayIndexMatcher = /* @__PURE__ */ new RegExp(arrayIndexSource)

// an array's length is at most 2 ** 32 - 1, so an integer key that large names a property rather than an element
export const maxArrayLength = 4294967295
