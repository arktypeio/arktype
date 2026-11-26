import type { anyOrNever, array, brand } from "@ark/util"
import type { ArrayType } from "./array.ts"
import type { BaseType } from "./base.ts"
import type { DateType } from "./date.ts"
import type { NumberType } from "./number.ts"
import type { ObjectType } from "./object.ts"
import type { StringType } from "./string.ts"

export type instantiateType<t, $> =
	// all branches have to conform to a single basis type those methods to be available
	[t] extends [anyOrNever] ? BaseType<t, $>
	: [t] extends [string] ? StringType<t, $>
	: [t] extends [number] ? NumberType<t, $>
	: [t] extends [ObjectBasis] ? instantiateObjectType<t, $>
	: BaseType<t, $>

// a branded primitive like Brand<boolean, "flag"> is assignable to object, so
// an object is told from one by what its brand, if it has one, is of
type ObjectBasis = object & { readonly [brand]?: [object, unknown] }

// a nested [array] check on t would resolve every member of an array t
type instantiateObjectType<t extends object, $> =
	[t] extends [array] ? ArrayType<t, $>
	: [t] extends [Date] ? DateType<t, $>
	: ObjectType<t, $>
