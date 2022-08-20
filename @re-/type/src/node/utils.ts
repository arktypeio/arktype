import { isRecursible, toString } from "@re-/tools"

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")

export const defToString = (def: unknown, indentation = ""): string => {
    if (typeof def === "string") {
        return def
    } else if (def instanceof RegExp) {
        return `/${def.source}/`
    } else if (isRecursible(def)) {
        return objectDefToString(def, indentation)
    } else if (typeof def === "bigint") {
        return `${def}n`
    }
    return String(def)
}

const objectDefToString = (
    def: Record<string | number, unknown>,
    indentation: string
) => {
    const isArray = Array.isArray(def)
    const nextIndentation = indentation + "    "
    let objDefToString = isArray ? "[" : "{"
    const defEntries = Object.entries(def)
    for (let i = 0; i < defEntries.length; i++) {
        objDefToString += "\n" + nextIndentation
        if (!isArray) {
            objDefToString += defEntries[i][0] + ": "
        }
        objDefToString += defToString(defEntries[i][1], nextIndentation)
        if (i !== defEntries.length - 1) {
            objDefToString += ","
        } else {
            objDefToString += "\n"
        }
    }
    return objDefToString + indentation + (isArray ? "]" : "}")
}

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export const stringifyPathContext = (path: string) =>
    path ? ` at path ${path}` : ""
