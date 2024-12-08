import { type } from "arktype"

// type stats 12/7/2024 on main
// {
//     "checkTime": 21.41,
//     "types": 826014,
//     "instantiations": 7316952
// }

// type stats 12/8/2024 on rc27
// {
//     "checkTime": 12.94,
//     "types": 402148,
//     "instantiations": 4850453
// }

// false
const t = type({ foo: "string" }).extends("Record<string, string>")
