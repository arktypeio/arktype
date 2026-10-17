export const arrayIndexSource = `^(?:0|[1-9]\\d*)$`

export const arrayIndexMatcher = /* @__PURE__ */ new RegExp(arrayIndexSource)

// 2 ** 32 - 1; larger integer keys are properties, not indices
export const maxArrayLength = 4294967295
