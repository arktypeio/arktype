import React from "react"
import { Page } from "../../components"
import documentation from "./documentation.md?raw"
import ReactMarkdown from "react-markdown"

export const Documentation = () => {
    return (
        <Page>
            <ReactMarkdown>{documentation}</ReactMarkdown>
        </Page>
    )
}

export default Documentation
