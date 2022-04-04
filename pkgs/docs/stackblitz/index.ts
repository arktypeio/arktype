import "./demo.css"
import { userModel, userData, userValidationResult } from "./model"

const recolor = (input) => {
    const lines = input.split("\n")
    let fixedInput = []
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
const buildKey = (key) => {
    return `<span class='key'>${key}</span>`
}
const buildVal = (val) => {
    val = val.trim()
    if (val.at(-1) == ",") {
        return `<span class='val'>${val.replace(",", "")}</span>,`
    } else if (val.at(-1) === "{") {
        return "{"
    }
    return `<span class='val'>${val}</span>`
}

const defElement = document.querySelector("#definition")
defElement.textContent = JSON.stringify(userModel.definition, null, 2)
defElement.innerHTML = recolor(defElement.innerHTML)

const dataElement = document.querySelector("#data")
dataElement.textContent = JSON.stringify(userData, null, 2)
dataElement.innerHTML = recolor(defElement.innerHTML)

document.querySelector("#result").textContent =
    userValidationResult.errors ?? "Looks good!"
