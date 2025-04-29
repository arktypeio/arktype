import { type } from "arktype"

const Thing = type(/^user-/).as<"foo">()

const out = Thing("f")
