import { type } from "arktype"
// ---cut---
const Positive = type("number > 0")
const AtLeastTen = Positive.and("number >= 10")

AtLeastTen.expression // "number >= 10"
