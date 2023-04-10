import "./demo.css"
import type { Problems, Type } from "arktype"
import { stringify } from "arktype/internal/utils/serialize.js"

type PopulateDemoArgs = {
    type: Type
    data: unknown
    problems: Problems
}
export const populateDemo = ({ data, type, problems }: PopulateDemoArgs) => {
    const defElement = document.querySelector("#definition")!
    defElement.textContent = stringify(type.definition, 2)
    defElement.innerHTML = recolor(defElement.innerHTML)

    const resultElement = document.querySelector("#output")!
    if (problems) {
        resultElement.textContent = `❌ problems:\n\n${problems}`
    } else {
        resultElement.textContent = `✅ data:\n\n${stringify(
            type(data).data,
            2
        )}`
        resultElement.innerHTML = recolor(resultElement.innerHTML)
    }
}

const recolor = (input: string) => {
    const lines = input.split("\\n")
    const fixedInput: string[] = []
    for (const line of lines) {
        if (line.includes(":")) {
            const parts = line.split(":")
            fixedInput.push(`${buildKey(parts[0])}: ${buildVal(parts[1])}`)
        } else {
            fixedInput.push(line)
        }
    }
    return fixedInput.join("\\n")
}

const buildKey = (key: string) => {
    return `<span class='key'>${key}</span>`
}
const buildVal = (val: string) => {
    const formatted = val.trim()
    if (formatted[formatted.length - 1] === ",") {
        return `<span class='val'>${formatted.replace(",", "")}</span>,`
    } else if (formatted[formatted.length - 1] === "{") {
        return "{"
    }
    return `<span class='val'>${formatted}</span>`
}
