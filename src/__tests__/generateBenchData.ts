import { writeFileSync } from "node:fs"
import { fromHere } from "@arktype/runtime"

const randomInRange = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

const cyclicSpaceSeed = Object.freeze({
    user: {
        name: "string",
        "friends?": "user[]",
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
            variants[`${i}${name}`] = Object.fromEntries(
                Object.entries(seedDef).map(([k, def]) => {
                    let randomizedDef = def as string
                    if (typeof def === "string") {
                        // Only randomize the cyclic space values
                        for (let name in cyclicSpaceSeed) {
                            if (name.endsWith("?")) {
                                name = name.slice(0, -1)
                            }
                            randomizedDef = randomizedDef.replaceAll(
                                name,
                                `${randomInRange(2, defCopyCount)}${name}`
                            )
                        }
                    }
                    return [`${i}${k}`, randomizedDef]
                })
            )
        }
        return { ...result, ...variants }
    }, {} as Record<string, any>)
    return JSON.stringify(defs, null, 4)
}

const seedMap = {
    cyclic: cyclicSpaceSeed
}

type GenerateSpaceBenchesOptions = {
    intervals: number[]
    seed: keyof typeof seedMap
}

const generateSpaceBenches = ({
    intervals,
    seed
}: GenerateSpaceBenchesOptions) => {
    const toFile = fromHere("generated", `${seed}.ts`)
    let benchDeclarations = ""
    for (const interval of intervals) {
        const spaceName = `${seed}${interval}`
        console.log(`Generating dictionary '${spaceName}'...`)
        benchDeclarations += `export const ${spaceName} = ${generateSpaceJson(
            interval,
            seedMap[seed]
        )} as const

`
    }
    writeFileSync(toFile, benchDeclarations)
}

generateSpaceBenches({
    intervals: [10, 100, 500],
    seed: "cyclic"
})
