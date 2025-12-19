import { join } from "@ark/util"
import { type } from "arktype"

const options = ["red", "blue"] as const

const color = type.enumerated(...options)

const darkColorLiteral = type.enumerated(
	...options.map(base => `${base}Dark` as const)
)

const darkColorRegex = type(`/^(${join(options, "|")})Dark$/`)
