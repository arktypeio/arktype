import type { anyOrNever, array } from "@ark/util"
import type { MorphAst } from "../keywords/ast.ts"
import type { ArrayType } from "./array.ts"
import type { DateType } from "./date.ts"
import type { MorphType } from "./morph.ts"
import type { NumberType } from "./number.ts"
import type { ObjectType } from "./object.ts"
import type { StringType } from "./string.ts"
import type { ValidatorType } from "./validator.ts"

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
