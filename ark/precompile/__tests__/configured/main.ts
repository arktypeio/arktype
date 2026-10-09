import "./config.ts"
import { type } from "arktype"

export const Score = type("number")

console.log(Score.allows(Number.NaN))
