export const rangeKinds = [
	"max",
	"min",
	"maxLength",
	"minLength",
	"before",
	"after"
] as const

export type RangeKind = (typeof rangeKinds)[number]

export const boundKinds = ["length", ...rangeKinds] as const

export type BoundKind = (typeof boundKinds)[number]
