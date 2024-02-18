import {
	compileSerializedValue,
	reference,
	type mutable,
	type replaceKey
} from "@arktype/util"
import type { PropKind, kindRightOf } from "../../shared/implement.js"
import type { FoldInput } from "../refinement.js"
import type { PropsInner } from "./props.js"

export type PropsFoldInput<kind extends PropKind> = replaceKey<
	FoldInput<"props">,
	"props",
	{
		-readonly [k in Exclude<
			keyof PropsInner,
			kindRightOf<kind>
		>]?: PropsInner[k] extends readonly unknown[] | undefined
			? mutable<PropsInner[k]>
			: PropsInner[k]
	}
>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
