import { Box } from "@mui/material"
import sdk, { EmbedOptions } from "@stackblitz/sdk"
//@ts-ignore
import html from "raw-loader!/stackblitz/index.html"
//@ts-ignore
import model from "raw-loader!/stackblitz/model.ts.raw"
//@ts-ignore
import populateDemo from "raw-loader!/stackblitz/populateDemo.ts"
//@ts-ignore
import space from "raw-loader!/stackblitz/space.ts.raw"

import React, { useEffect } from "react"
import { demoGen } from "./demoGen"
import css from "!!raw-loader!/stackblitz/demo.css"

export type ModelDemoProps = {
    embedId: "model" | "space"
}
enum Template {
    ts = "typescript",
    js = "javascript",
    html = "html"
}
const getEmbedOptions = (): EmbedOptions => ({
    clickToLoad: false,
    view: "default",
    height: "100%",
    width: "100%",
    openFile: "model.ts"
})

type Thing = {
    files: Record<string, string>
    title: string
    description: string
    template: Template
    embedId: string
}
const createStackblitzDemo = ({
    files,
    title,
    description,
    template,
    embedId
}: Thing) => {
    sdk.embedProject(
        "demo",
        {
            files,
            title,
            description,
            template,
            dependencies: {
                "@re-/tools": "2.1.1",
                "@re-/model": "2.0.3-alpha"
            }
        },
        getEmbedOptions()
    )
}

export const ModelDemo = ({ embedId }: ModelDemoProps) => {
    useEffect(() => {
        createStackblitzDemo({
            files: {
                "index.html": html,
                "index.ts": demoGen(),
                "demo.css": css,
                "model.ts": model,
                "populateDemo.ts": populateDemo
            },

            title: "hi",
            description: "hello",
            template: Template.ts,
            embedId
        })
    }, [])
    return (
        <Box
            style={{
                width: "100%",
                height: "660px",
                border: 0,
                marginLeft: -8,
                marginRight: -8,
                padding: 16,
                overflow: "hidden",
                borderRadius: "8px"
            }}
        >
            <div
                id="demo"
                // src="https://stackblitz.com/edit/re-model?embed=1&file=model.ts&hideDevTools=1&hideExplorer=1&hideNavigation=1&theme=dark"
                // style={{ height: "100%", width: "100%", borderRadius: 8 }}
                // title="@re-/model"
                // sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            ></div>
        </Box>
    )
}
