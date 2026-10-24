import { type } from "arktype"
import { optional } from "./helpers.ts"
import { max } from "./limits.ts"
import { Pet, trim } from "./morphs.ts"
import { range } from "./ranges.ts"
import { pair, shape } from "./shapes.ts"
import { tweak } from "./tweaks.ts"

tweak()

class Upload extends Blob {}

export const Limited = type(`string <= ${max}`)
export const Optional = type(optional("string"))
export const Shaped = type(shape)
export const First = type(pair.first)
export const Second = type(pair.second)
export const Ranged = type(`number >= ${range.min}`)
export const Trimmed = type("string").pipe(trim)
export const IsPet = type.instanceOf(Pet)
export const IsUpload = type.instanceOf(Upload)
