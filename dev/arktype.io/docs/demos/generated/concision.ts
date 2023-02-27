export default `import z from "zod"
import { type } from "arktype"

// Hover to infer... ⛵
const playerTwo = type({
    name: "string",
    birthday: ["string", "|>", (s) => new Date(s)],
    "powerLevel?": "1<=number<9000"
})

// Hover to infer... 🦸
const playerOne = z.object({
    name: z.string(),
    birthday: z.preprocess(
        (arg) => (typeof arg === "string" ? new Date(arg) : undefined),
        z.date()
    ),
    powerLevel: z.number().gte(1).lt(9000).optional()
})
`
