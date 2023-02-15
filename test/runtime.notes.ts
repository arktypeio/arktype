/**  // data is "foo"
 *   1. "string"
 *   2. "string|number"
 *   3. "string|number[]"
 *  *   // data to ["foo"]
 *   4. "(string|number)[]"
 *   5. "(email|number)[]"
 *  // data to ["david@arktype.io"]
 *   6. "(email|1<=number)[]"
 *   7. "(email|1<number<=10)[]"
 *  // data to ["david@arktype.io", "shawn@arktype.io"]
 *   8. {
 *      myKey: "(email|1<number<10)[]",
 *   }
 *   // data to {myType: ["david@arktype.io", "shawn@arktype.io"]}
 *   9. {
 *      myKey: "(email|1<number<10)[]",
 *      nested: {}
 *   }
 *   8. {
 *      myKey: "(email|1<number<10)[]",
 *      nested: {
 *         "optional?": "parsedDate"
 *      }
 *   }
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

const ids = type("any")

ids("ssalbdivad")

//********** TS KEYWORDS ********** /
type("string")

//********** TS EXPRESSIONS ********** /
type("string|number")
type("string|number[]")

ids(["ssalbdivad"])

type("(string|number)[]")

//********** VALIDATION KEYWORDS ********** /
const contributors = type("email[]")

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
    version: /d+\.d+\.d+/,
    contributors: "email[]>1",
    "dependencies?": "string[]"
})

pkg({
    name: "arktype",
    version: "1.0.0",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

//********** SCOPES ********** /
const types = scope({
    package: {
        name: "string",
        version: /d+\.d+\.d+/,
        contributors: "email[]>1",
        "devDependencies?": "string[]"
    }
}).compile()

types.package({
    name: "arktype",
    version: "1.0.0",
    contributors: ["david@arktype.io", "shawn@arktype.io"]
})

scope({
    pkg: {
        name: "string",
        version: /d+\.d+\.d+/,
        contributors: "contributors",
        "devDependencies?": "string[]"
    },
    contributors: "email[]>1"
})

//********** CYCLIC SCOPES ********** /
scope({
    package: {
        name: "string",
        version: /d+\.d+\.d+/,
        contributors: "contributors",
        "devDependencies?": "package[]"
    },
    contributors: "email[]>1"
})

types.package({
    name: "arktype",
    version: "1.0.0",
    contributors: ["david@arktype.io", "shawn@arktype.io"],
    devDependencies: [
        {
            name: "typescript",
            version: "5.0.0-beta",
            contributors: ["andersh@microsoft.com"]
        }
    ]
})

//********** CYCLIC DATA ********** /

const getPackage = () => {
    const data = {
        name: "arktype",
        version: "1.0.0",
        contributors: ["david@arktype.io", "shawn@arktype.io"],
        devDependencies: [
            {
                name: "typescript",
                version: "5.0.0-beta",
                contributors: ["andersh@microsoft.com"]
            }
        ]
    }
    data.devDependencies.push(data)
    return data
}

types.package(getPackage())

//********** NARROWING ********** /
scope({
    package: {
        name: "string",
        version: /d+\.d+\.d+/,
        contributors: "contributors",
        "devDependencies?": [
            "package[]",
            "=>",
            (packages) => packages.every((pkg) => pkg.name !== "left-pad")
        ]
    },
    contributors: "email[]>1"
})
