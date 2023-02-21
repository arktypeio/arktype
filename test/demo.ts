import { scope } from "arktype"

const types = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "authorList"
    },
    authorList: "1<email[]<=10"
}).compile()

const parsers = scope({})
