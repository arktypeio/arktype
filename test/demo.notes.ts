/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

const contributors = type("string")

contributors(["david@arktype.io"])

//********** TS KEYWORDS ********** /
type("string")

//********** TS EXPRESSIONS ********** /
type("string|undefined")
type("string|undefined[]")
type("(string|undefined)[]")
type("string[]|undefined")

//********** OBJECTS LITERALS ********** /
const pkg = type({
    name: "string",
    "contributors?": contributors
})

pkg({
    name: "arktype",
    contributors: ["david@arktype.io"]
})

const pkg2 = type({
    name: "string",
    "contributors?": "string[]"
})

//********** VALIDATION- REGEX ********** /
type({
    name: "string",
    version: /^\d+\.\d+\.\d+$/,
    "contributors?": "string[]"
})

pkg({
    name: "arktype",
    version: "1.0.0",
    contributors: ["david@arktype.io"]
})

//********** VALIDATION- KEYWORDS ********** /

// Data: update version
pkg({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io"]
})

// Type: update for version and contributors
type({
    name: "string",
    version: "semver",
    "contributors?": "email[]"
})

//********** VALIDATION- Range ********** /

type({
    name: "string",
    version: "semver",
    // ⬇️
    "contributors?": "1<email[]<=10"
})

pkg({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

//********** SCOPES ********** /
// no changes, just translating existing types over so far

const types = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "1<email[]<=10"
    }
}).compile()

const { data, problems } = types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

scope({
    package: {
        name: "string",
        version: "semver",
        // ⬇️
        "contributors?": "authorList"
    },
    // ⬇️
    authorList: "1<email[]<=10"
}).compile()

console.log(problems?.summary ?? data)

//********** CYCLIC SCOPES ********** /

const cyclicTypes = scope({
    package: {
        name: "string",
        version: "semver",
        dependencies: "package[]"
    }
}).compile()

// prettier-ignore
cyclicTypes.package({
    name: "arktype",
    version: "1.0.0-alpha",
    dependencies: [{ name: "typescript", version: "5.0.0-beta", dependencies: [] }]
})

console.log(problems?.summary ?? data)
//********** NARROWING ********** /

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    dependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        },
        // ⬇️
        {
            name: "left-pad",
            version: "1.3.0"
        }
    ]
})

scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "authorList",
        // ⬇️
        dependencies: [
            "package[]",
            "=>",
            (packages) => packages.every((pkg) => pkg.name !== "left-pad")
        ]
    },
    authorList: "1<email[]<=10"
})

//********** CUSTOM ERRORS ********** /

scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "authorList",
        dependencies: [
            "package[]",
            "=>",
            // ⬇️
            (pkgs, problems) =>
                pkgs.every(({ name }) => name !== "left-pad") ||
                !problems.mustBe("not breaking the internet")
        ]
    },
    authorList: "1<email[]<=10"
})

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    dependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        }
        // ⬇️
        // {
        //     name: "left-pad",
        //     version: "1.3.0"
        // }
    ]
})

//********** Morphs, SCOPE IMPORTS ********** /

const threeSixtyNo = scope({
    three: "'three'",
    sixty: "60",
    no: "false"
}).compile()

threeSixtyNo.sixty(60)

console.log(problems?.summary ?? data)

scope(
    {
        three: "'three'",
        sixty: "60",
        no: "false",
        packages: "package[]"
    },
    { imports: [cyclicTypes] }
).compile()

type Package = typeof cyclicTypes.package.infer

const arktype = {
    name: "arktype",
    version: "1.0.0-alpha",
    dependencies: []
}

const installTypes = scope(
    {
        installArktype: [
            "package",
            "|>",
            (pkg) => ({
                ...pkg,
                dependencies: [
                    ...pkg.dependencies,
                    {
                        name: "arktype",
                        version: "1.0.0-alpha",
                        dependencies: []
                    }
                ]
            })
        ]
    },
    { imports: [cyclicTypes] }
).compile()

installTypes.installArktype({
    name: "your-typesafe-project",
    version: "3.1.4",
    dependencies: []
})

//********** CYCLIC DATA ********** /

// ⬇️
const getPackage = () => {
    const data = {
        name: "arktype",
        version: "1.0.0-alpha",
        contributors: ["david@arktype.io", "shawn@arktype.io"],
        dependencies: [
            {
                name: "typescript",
                version: "5.0.0-beta"
            }
        ]
    }
    data.dependencies.push(data)
    return data
}

// ⬇️
types.package(getPackage())
