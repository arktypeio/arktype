import { scope } from "arktype"

const types = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "1<email[]<=10"
    }
}).compile()

const { problems, data } = types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

console.log(problems?.summary ?? data)
