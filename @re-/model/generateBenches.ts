import { writeFileSync } from "node:fs"
import { fromHere } from "@re-/node"

const randomInRange = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

const simpleSpaceSeed = Object.freeze({
    user: {
        name: "string",
        age: "number",
        emails: "email[]"
    },
    group: {
        title: "string",
        admins: "string[]?",
        isActive: "boolean|undefined"
    }
})

const cyclicSpaceSeed = Object.freeze({
    user: {
        name: "string",
        friends: "user[]?",
        groups: "group[]"
    },
    group: {
        title: "string",
        members: "user[]",
        isActive: "boolean|undefined"
    }
})

const generateSpaceJson = (interval: number, seedDefs: object) => {
    const defs = Object.entries(seedDefs).reduce((result, [name, seedDef]) => {
        const variants: Record<string, any> = { [name]: seedDef }
        const defCopyCount = Math.floor(interval / 2)
        for (let i = 2; i <= defCopyCount; i++) {
            variants[`${name}${i}`] = Object.fromEntries(
                Object.entries(seedDef).map(([k, def]) => {
                    let randomizedDef = def as string
                    if (typeof def === "string") {
                        // Only randomize the cyclic space values
                        for (const name in cyclicSpaceSeed) {
                            randomizedDef = randomizedDef.replaceAll(
                                name,
                                `${name}${randomInRange(2, defCopyCount)}`
                            )
                        }
                    }
                    return [`${k}${i}`, randomizedDef]
                })
            )
        }
        return { ...result, ...variants }
    }, {} as Record<string, any>)
    return JSON.stringify(defs, null, 4)
}

const importTemplate = `import { bench } from "@re-/assert"
import { compile } from "@re-/model"

`

const seedMap = {
    simple: simpleSpaceSeed,
    cyclic: cyclicSpaceSeed
}

type GenerateSpaceBenchesOptions = {
    toFile: string
    intervals: number[]
    seed: keyof typeof seedMap
}

const generateSpaceBenches = ({
    toFile,
    intervals,
    seed
}: GenerateSpaceBenchesOptions) => {
    writeFileSync(toFile, importTemplate)
    for (const interval of intervals) {
        const benchName = `compile-${seed}(${interval})`
        console.log(`Generating bench '${benchName}'...`)
        const benchForInterval = `bench("${benchName}", () => {
    const space = compile(${generateSpaceJson(interval, seedMap[seed])}
    )
}).median().type.median()

`
        writeFileSync(toFile, benchForInterval, { flag: "a" })
    }
}

generateSpaceBenches({
    toFile: fromHere("src", "__benches__", "compileCyclic.bench.ts"),
    intervals: [10, 50, 100, 250, 500],
    seed: "cyclic"
})
