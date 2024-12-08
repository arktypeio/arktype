// type stats 12/7/2024 on main

import { type } from "arktype"

// {
//     "checkTime": 21.41,
//     "types": 826014,
//     "instantiations": 7316952
// }

// false
const t = type({ foo: "string" }).extends("Record<string, string>")
