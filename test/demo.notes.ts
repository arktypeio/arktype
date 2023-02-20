/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

const contributors = type("string")

contributors("david@arktype.io")

//********** TS KEYWORDS ********** /
type("string")

//********** TS EXPRESSIONS ********** /
type("string|number")
type("string|number[]")

contributors(["david@arktype.io"])

type("(string|number)[]")

//********** VALIDATION KEYWORDS ********** /
type("email[]")

contributors(["david@arktype.io"])

type("email[]>1")

contributors(["david@arktype.io", "shawn@arktype.io"])

//********** OBJECTS LITERALS ********** /
const pkg = type({
    contributors: "email[]>1"
})

pkg({
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

//********** REGEX, OPTIONAL KEYS ********** /
type({
    name: "string",
    version: /\d+\.\d+\.\d+/, // ⬅️
    contributors: "email[]>1", // ⬅️
    "dependencies?": "string[]" // ⬅️
})

pkg({
    name: "arktype",
    version: "1.0.0",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

// pause

pkg({
    name: "arktype",
    version: "1.0.0-alpha", // ⬅️
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

type({
    name: "string",
    version: "semver", // ⬅️
    contributors: "email[]>1",
    "dependencies?": "string[]"
})

//********** SCOPES ********** /
// ⬇️
const types = scope({
    package: {
        name: "string",
        version: "semver",
        contributors: "email[]>1",
        "devDependencies?": "string[]"
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
        version: /\d+\.\d+\.\d+/,
        "contributors?": "contributors",
        "devDependencies?": "string[]"
    },
    contributors: "email[]>1"
})

//********** CYCLIC SCOPES ********** /
scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        "devDependencies?": "package[]"
    },
    contributors: "email[]>1"
})

types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    // ⬇️
    devDependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta"
        }
    ]
})

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

//********** NARROWING ********** /

const getPackage2 = () => {
    const data = {
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
    }
    data.devDependencies.push(data)
    return data
}

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
    contributors: "email[]>1"
})

const getPackage3 = () => {
    const data = {
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
    }
    data.devDependencies.push(data)
    return data
}

//********** MORPHS ********** /

const types2 = scope({
    package: {
        name: "string",
        version: "semver",
        "contributors?": "contributors",
        "devDependencies?": [
            "package[]",
            "=>",
            (packages) => packages.every((pkg) => pkg.name !== "left-pad")
        ]
    },
    contributors: "email[]>1"
}).compile()

// ⬇️
const json = scope({
    parsePackage: ["string", "|>", (s) => types2.package(JSON.parse(s))]
})

//********** SCOPE IMPORTS ********** /

const getPackage4 = () => {
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

const json2 = scope(
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
