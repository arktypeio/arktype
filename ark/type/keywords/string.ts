import { wellFormedNumberMatcher } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { regexStringNode } from "./utils/regex.js"

const parsableNumber = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export type stringExports = {}

export type stringModule = Module<stringExports>

export const stringModule: stringModule = scope(
	{
		parsableNumber
	},
	{
		prereducedAliases: true
	}
).export()
