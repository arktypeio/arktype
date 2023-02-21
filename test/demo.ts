import { type } from "arktype"

const contributors = type("string[]|undefined")

const pkg = type({
    name: "string",
    "contributors?": contributors
})

const { data, problems } = pkg({
    name: "arktype",
    contributors: ["david@arktype.io"]
})

console.log(problems?.summary ?? data)
