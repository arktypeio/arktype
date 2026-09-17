import { join } from "@ark/util"
import { type } from "arktype"

const options = ["red", "blue"] as const

const color = type.enumerated(...options)

const darkColorLiteral = type.enumerated(
	...options.map(base => `${base}Dark` as const)
)

const darkColorRegex = type(`/^(${join(options, "|")})Dark$/`)

const literalValues = <t>(t: type.Any<t>): t[] => {
	const literals: unknown[] = []
	for (const branch of t.internal.branches) {
		if (branch.hasKind("unit")) {
			literals.push(branch.unit)
		}
	}
	return literals as never
}

const palette = type.enumerated("red", "blue")

// ["blue", "red"]
literalValues(palette)
