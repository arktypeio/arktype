import { bench } from "@ark/attest"
import type { makeComplexType } from "./utils.ts"

bench(
	"exceeds baseline",
	() => ({}) as makeComplexType<"defenestration">
).types([1, "instantiations"])
