import React from "react"
import { Page } from "../../components"
import documentation from "./documentation.md?raw"
import ReactMarkdown from "react-markdown"
// @ts-ignore
import rehypeHighlight from "rehype-highlight"

export const Documentation = () => {
    return (
        <Page subHeader={false} getStarted={false} overrideMobile={true}>
            <div style={{ maxWidth: 600 }}>
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {documentation}
                </ReactMarkdown>
            </div>
        </Page>
    )
}

export default Documentation
