import { printable, throwParseError } from "@ark/util"

export interface BoundUnit {
	readonly singular: string
	readonly plural: string
}

export type BoundUnitInput = string | BoundUnit

export const boundUnits = {
	character: /* @__PURE__ */ Object.freeze<BoundUnit>({
		singular: "character",
		plural: "characters"
	}),
	item: /* @__PURE__ */ Object.freeze<BoundUnit>({
		singular: "item",
		plural: "items"
	})
} as const

export const writeInvalidBoundUnitMessage = (unit: unknown): string =>
	`Bound unit must be a non-empty string or { singular, plural } object (was ${printable(unit)})`

export const normalizeBoundUnit = (unit: BoundUnitInput): BoundUnit => {
	if (typeof unit === "string") {
		if (!unit) throwParseError(writeInvalidBoundUnitMessage(unit))
		return (
			unit === "character" ? boundUnits.character
			: unit === "item" ? boundUnits.item
			: Object.freeze({ singular: unit, plural: `${unit}s` })
		)
	}
	if (
		typeof unit !== "object" ||
		unit === null ||
		typeof unit.singular !== "string" ||
		!unit.singular ||
		typeof unit.plural !== "string" ||
		!unit.plural
	)
		throwParseError(writeInvalidBoundUnitMessage(unit))
	return (
		unit.singular === "character" && unit.plural === "characters" ?
			boundUnits.character
		: unit.singular === "item" && unit.plural === "items" ? boundUnits.item
		: Object.freeze({ singular: unit.singular, plural: unit.plural })
	)
}

export const sameBoundUnit = (
	l: BoundUnit | undefined,
	r: BoundUnit | undefined
): boolean =>
	l === r ||
	(l !== undefined &&
		r !== undefined &&
		l.singular === r.singular &&
		l.plural === r.plural)

export const formatBoundCount = (
	rule: number,
	unit: BoundUnit | undefined,
	fallback = `${rule}`
): string =>
	unit ? `${rule} ${rule === 1 ? unit.singular : unit.plural}` : fallback
