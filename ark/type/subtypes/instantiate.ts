import type { anyOrNever, array } from "@ark/util"
import type { MorphAst } from "../ast.js"
import type { ArrayType } from "./array.js"
import type { DateType } from "./date.js"
import type { MorphType } from "./morph.js"
import type { NumberType } from "./number.js"
import type { ObjectType } from "./object.js"
import type { StringType } from "./string.js"
import type { ValidatorType } from "./validator.js"

export type instantiateType<t, $> =
	// if any branch of t is a MorphAst, instantiate it as a MorphType
	[Extract<t, MorphAst>] extends [anyOrNever] ?
		// otherwise, all branches have to conform to a single basis type those methods to be available
		[t] extends [string] ? StringType<t, $>
		: [t] extends [number] ? NumberType<t, $>
		: [t] extends [object] ?
			[t] extends [array] ? ArrayType<t, $>
			: [t] extends [Date] ? DateType<t, $>
			: ObjectType<t, $>
		:	ValidatorType<t, $>
	:	MorphType<t, $>
