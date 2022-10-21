export default `import "./demo.css"

type PopulateDemoArgs = {
    data: object
    definition: object
    error: string
}
export const populateDemo = ({ data, definition, error }: PopulateDemoArgs) => {
    const defElement = document.querySelector("#definition")!
    defElement.textContent = JSON.stringify(definition, null, 2)
    defElement.innerHTML = recolor(defElement.innerHTML)

    const dataElement = document.querySelector("#data")!
    dataElement.textContent = JSON.stringify(data, null, 2)
    dataElement.innerHTML = recolor(dataElement.innerHTML)

    document.querySelector("#result")!.textContent = error ?? "Looks good!"
}

const recolor = (input: string) => {
    const lines = input.split("\n")
    const fixedInput: string[] = []
    for (const line of lines) {
        if (line.includes(":")) {
            const parts = line.split(":")
            fixedInput.push(\`\${buildKey(parts[0])}: \${buildVal(parts[1])}\`)
        } else {
            fixedInput.push(line)
        }
    }
    return fixedInput.join("\n")
}

const buildKey = (key: string) => {
    return \`<span class='key'>\${key}</span>\`
}
const buildVal = (val: string) => {
    const formatted = val.trim()
    if (formatted.at(-1) === ",") {
        return \`<span class='val'>\${formatted.replace(",", "")}</span>,\`
    } else if (formatted.at(-1) === "{") {
        return "{"
    }
    return \`<span class='val'>\${formatted}</span>\`
}
`
