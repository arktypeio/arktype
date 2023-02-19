/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

const types2 = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        // ⬇️
        "devDependencies?": [
            "package[]",
            "=>",
            (packages) => packages.every((pkg) => pkg.name !== "left-pad")
        ]
    },
    contributors: "email[]>1"
}).compile()

export type Package = typeof types2.package.infer

const getPackage3 = () => {
    const data = {
        name: "arktype",
        version: "1.0.0-beta",
        contributors: ["david@arktype.io", "shawn@arktype.io"],
        devDependencies: [
            {
                name: "typescript",
                version: "5.0.0-beta"
            }
        ]
    }
    data.devDependencies.push(data)
    return data
}

const { data, problems } = types2.package(getPackage3())

console.log(data ?? problems.summary)
