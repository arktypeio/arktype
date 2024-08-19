import { intrinsic } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import { epoch } from "./epoch.ts"
import { integer } from "./integer.ts"

export const arkNumber: Module<arkNumber.submodule> = submodule({
	$root: intrinsic.number,
	integer,
	epoch
})

export declare namespace arkNumber {
	export type submodule = Submodule<{
		$root: number
		epoch: epoch
		integer: integer
	}>
}
