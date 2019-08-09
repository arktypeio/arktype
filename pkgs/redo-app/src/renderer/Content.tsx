import React from "react"
import { PageRouter } from "pages"
import { component } from "blocks"
import { hot } from "react-hot-loader/root"
import { AppContents } from "redo-components"

const PossiblyHotContent = component({
    name: "Content"
})(({}) => {
    return (
        <AppContents>
            <PageRouter />
        </AppContents>
    )
})

export const Content =
    process.env.NODE_ENV === "development"
        ? hot(PossiblyHotContent)
        : PossiblyHotContent
