/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import "./demo.css"

type PopulateDemoArgs = {
    error: string
    type: object
    data: object
}
export const populateDemo = ({ data, type, error }: PopulateDemoArgs) => {
    const defElement = document.querySelector("#definition")!
    defElement.textContent = JSON.stringify(type, null, 2)
    defElement.innerHTML = recolor(defElement.innerHTML)

    const dataElement = document.querySelector("#data")!
    dataElement.textContent = JSON.stringify(data, null, 2)
    dataElement.innerHTML = recolor(dataElement.innerHTML)

    document.querySelector("#result")!.textContent = error ?? "Looks good!"
}

function recolor(input: string) {
    const lines = input.split("\n")
    const fixedInput: string[] = []
    for (const line of lines) {
        if (line.includes(":")) {
            const parts = line.split(":")
            fixedInput.push(`${buildKey(parts[0])}: ${buildVal(parts[1])}`)
        } else {
            fixedInput.push(line)
        }
    }
    return fixedInput.join("\n")
}
function buildKey(key: string) {
    return `<span class='key'>${key}</span>`
}
function buildVal(val: string) {
    const formatted = val.trim()
    if (formatted.at(-1) === ",") {
        return `<span class='val'>${formatted.replace(",", "")}</span>,`
    } else if (formatted.at(-1) === "{") {
        return "{"
    }
    return `<span class='val'>${formatted}</span>`
}
