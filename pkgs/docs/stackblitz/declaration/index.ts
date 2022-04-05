import "./demo.css"
import { space, groupData, groupValidationResult } from "./models"

const recolor = (input: string) => {
    const lines = input.split("\n")
    const fixedInput = []
    for (let line of lines) {
        if (line.includes(":")) {
            const lineArray = line.split(":")
            fixedInput.push(
                `${buildKey(lineArray[0])}: ${buildVal(lineArray[1])}`
            )
        } else {
            fixedInput.push(line)
        }
    }
    return fixedInput.join("\n")
}
const buildKey = (key: string) => {
    return `<span class='key'>${key}</span>`
}
const buildVal = (val: string) => {
    val = val.trim()
    if (val.at(-1) == ",") {
        return `<span class='val'>${val.replace(",", "")}</span>,`
    } else if (val.at(-1) === "{") {
        return "{"
    }
    return `<span class='val'>${val}</span>`
}

const defElement = document.querySelector("#definition")!
defElement.textContent = JSON.stringify(space.resolutions, null, 2)
defElement.innerHTML = recolor(defElement.innerHTML)

const dataElement = document.querySelector("#data")!
dataElement.textContent = JSON.stringify(groupData, null, 2)
dataElement.innerHTML = recolor(defElement.innerHTML)

const resultElement = document.querySelector("#result")!
resultElement.textContent = groupValidationResult.error ?? "Looks good!"
