import { scope, type } from "arktype"

const even = type.number.divisibleBy(2).brand("even")
