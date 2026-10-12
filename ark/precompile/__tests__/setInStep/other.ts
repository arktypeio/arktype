import { extend, extendPatterned } from "./items.ts"
import { r } from "./r.ts"

export const viaOther = () => r(() => extend({ e: "number" }))

export const viaOtherPatterned = () => r(() => extendPatterned({ f: "number" }))
