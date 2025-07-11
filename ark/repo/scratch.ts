import { type } from "arktype"

const why = type("(0 | (1 | (2 | (3 | (4 | 5)[])[])[])[])[]")

why.assert([0, [2]])
