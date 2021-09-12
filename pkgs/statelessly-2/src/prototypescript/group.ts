import { define } from "./types"

export const group = define.group({
    name: "string",
    description: "string?",
    members: "user[]",
    owner: "user"
})
