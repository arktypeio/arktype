import { attest, contextualize } from "@ark/attest"
import { inertImportsOf } from "@ark/aot/internal/inert.ts"
import { SourceModule } from "@ark/aot/internal/module.ts"

const importsOf = (source: string) =>
	inertImportsOf(new SourceModule("/app/helpers.ts", source, "helpers.ts"))

contextualize(() => {
	it("lists what a module that only declares imports values from", () => {
		attest(
			importsOf(`"use client"
import type { User } from "./user.ts"
import { least } from "./least.ts"
export * from "./more.ts"
export { most } from "./most.ts"

const pattern = /^[a-z]+$/
const reserved = new Set(["admin", "root"])
const limits = { least: 1, most: [20, -1], check: (s: string) => s.length > 1 } as const
export function isName(s: string): boolean {
	return pattern.test(s) && !reserved.has(s) && s.length > least
}
export const isShort = (s: string) => s.length < limits.most[0]
export const checks = { isName, isShort }
export default isShort
export type Name = string
export interface Named { name: Name }
`)
		).equals(["./least.ts", "./more.ts", "./most.ts"])
	})

	it("is undefined for a module that runs a call as it loads", () => {
		attest(importsOf(`console.log("loaded")\n`)).equals(undefined)
		attest(importsOf(`export const least = Number("2")\n`)).equals(undefined)
		attest(importsOf(`export const all = new Set(load())\n`)).equals(undefined)
		attest(importsOf(`export const { least } = { least: 1 }\n`)).equals(
			undefined
		)
	})

	it("is undefined where a value reads what another module declares, or what isn't declared yet", () => {
		attest(
			importsOf(
				`import { least } from "./least.ts"\n\nexport const most = least\n`
			)
		).equals(undefined)
		attest(importsOf(`export const most = least\nconst least = 1\n`)).equals(
			undefined
		)
		attest(importsOf(`export const origin = location\n`)).equals(undefined)
		attest(importsOf(`export const read = { ...defaults }\n`)).equals(undefined)
	})

	it("is undefined for a class, whose static blocks and keys run", () => {
		attest(importsOf(`export class Name {}\n`)).equals(undefined)
	})
})
