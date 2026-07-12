import { isWellFormedNumber } from "./numbers.ts"

export const byteUnitScales = {
	B: 1,
	KB: 1_000,
	MB: 1_000_000,
	GB: 1_000_000_000,
	TB: 1_000_000_000_000
} as const

export type ByteUnit = keyof typeof byteUnitScales

export type SizeLiteral<n extends number = number> = `${n}${ByteUnit}`

const sizeLiteralMatcher = new RegExp(
	`^(\\d+(?:\\.\\d+)?)(${Object.keys(byteUnitScales).join("|")})$`
)

/**
 * Parse a size literal like "5MB" to its value in bytes, or return undefined if
 * `value` is not a well-formed size literal. Mirrors {@link tryParseWellFormedNumber}.
 */
export const tryParseSizeLiteral = (value: string): number | undefined => {
	const match = sizeLiteralMatcher.exec(value)
	// reuse the numeric literal hygiene rules (reject "05MB", "5.0MB", etc.)
	if (!match || !isWellFormedNumber(match[1])) return undefined

	const bytes = Number(match[1]) * byteUnitScales[match[2] as ByteUnit]
	// snap IEEE-754 artifacts from fractional units (e.g. 1.005 * 1000 = 1004.9999…)
	const rounded = Math.round(bytes)
	return Math.abs(bytes - rounded) < 1e-6 ? rounded : bytes
}

/**
 * Render a byte count as the most compact exact size literal (e.g. 5000000 -> "5MB"),
 * falling back to "N bytes" when no unit above B divides it evenly. Mirrors
 * {@link describeCollapsibleDate}.
 */
export const describeCollapsibleSize = (bytes: number): string => {
	const units = Object.entries(byteUnitScales)
	// skip B (index 0) so sub-KB values read as "N bytes" alongside the "N bytes" actual
	for (let i = units.length - 1; i >= 1; i--) {
		const [unit, scale] = units[i]
		if (bytes >= scale && bytes % scale === 0) return `${bytes / scale}${unit}`
	}
	return `${bytes} bytes`
}
