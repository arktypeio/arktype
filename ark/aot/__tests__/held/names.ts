import { type } from "arktype"

export const isLong = (s: string) => s.length > 3

export const Name = type("string").narrow(isLong)
