import { type } from "arktype"

const safe = type("number.safe")

const out = safe(Infinity)
