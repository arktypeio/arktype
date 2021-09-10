import { define } from "./model"

export const group = define("group", {
    name: "string",
    description: "string?",
    members: "user[]",
    owner: "user"
})
