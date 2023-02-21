import { type } from "arktype"

const contributors = type("string[]|undefined")

const pkg = type({
    name: "string",
    contributors: contributors
})

type Package = typeof pkg.infer

const { data, problems } = contributors(["david@arktype.io"])

console.log(problems?.summary ?? data)
