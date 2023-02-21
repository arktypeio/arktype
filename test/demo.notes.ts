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
    // with anonymous type
    "contributors?": contributors
})

const pkg2 = type({
    name: "string",
    // inline string def
    "contributors?": "string[]|undefined"
})

// Replace ^? with inferred type
export type Package = typeof types.package.infer

/** ➡️ COPY THIS FIRST */
pkg({
    name: "arktype",
    contributors: ["david@arktype.io"]
})

//********** VALIDATION- REGEX ********** /
type({
    name: "string",
    /** ⬇️ COPY THIS FIRST */
    version: /^\d+\.\d+\.\d+$/,
    "contributors?": "string[]"
})

pkg({
    name: "arktype",
    // ⬇️
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

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

scope({
    pkg: {
        name: "string",
        version: "semver",
        "contributors?": "contributors"
    },
    contributors: "1<email[]<=10"
})

//********** CYCLIC SCOPES ********** /
scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        "devDependencies?": "package[]"
    },
    contributors: "1<email[]<=10"
})

// Add TS as dependency
types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    devDependencies: [
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
    devDependencies: [
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
        "contributors?": "contributors",
        // ⬇️
        "devDependencies?": [
            "package[]",
            "=>",
            (packages) => packages.every((pkg) => pkg.name !== "left-pad")
        ]
    },
    contributors: "1<email[]<=10"
})

//********** CUSTOM ERRORS ********** /

scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        "devDependencies?": [
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
    contributors: "1<email[]<=10"
})

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    devDependencies: [
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

const types2 = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        // ⬇️ reset
        "devDependencies?": "package[]"
    },
    contributors: "1<email[]<=10"
}).compile()

// ⬇️
const json = scope({
    parsePackage: ["string", "|>", (s) => types2.package(JSON.parse(s))]
})

//********** SCOPE IMPORTS ********** /

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    devDependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        }
    ]
})

scope(
    {
        parsePackage: ["string", "|>", (s) => types2.package(JSON.parse(s))],
        // ⬇️
        extractSpecifier: [
            "package",
            "|>",
            (data) => `${data.name}@${data.version}`
        ]
    },
    { imports: [types2] }
)

//********** CYCLIC DATA ********** /

// ⬇️
const getPackage = () => {
    const data = {
        name: "arktype",
        version: "1.0.0-alpha",
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

// ⬇️
types.package(getPackage())
