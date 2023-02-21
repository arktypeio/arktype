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

console.log(problems?.summary ?? data)

//********** CYCLIC SCOPES ********** /
const cyclicTypes = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "authorList",
        dependencies: "package[]"
    },
    authorList: "1<email[]<=10"
}).compile()

type Package3 = typeof cyclicTypes.package.infer

// Add TS as dependency
types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    dependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        }
    ]
})

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
            (packages, problems) => {
                if (packages.some(({ name }) => name === "left-pad")) {
                    problems.mustBe("not breaking the internet")
                    return false
                }
                return true
            }
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

//********** MORPHS ********** /

const morphTypes = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "authorList",
        // ⬇️ reset
        dependencies: "package[]"
    },
    authorList: "1<email[]<=10"
}).compile()

// ⬇️
const json = scope({
    parsePackage: ["string", "|>", (s) => morphTypes.package(JSON.parse(s))]
})

//********** SCOPE IMPORTS ********** /

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    dependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        }
    ]
})

scope(
    {
        parsePackage: [
            "string",
            "|>",
            (s) => morphTypes.package(JSON.parse(s))
        ],
        // ⬇️
        extractSpecifier: [
            "package",
            "|>",
            (data) => `${data.name}@${data.version}`
        ]
    },
    { imports: [morphTypes] }
)

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
