import React from "react"
import { Theme } from "@material-ui/core/styles"
import { createStyles } from "@material-ui/styles"
import { PageRouter } from "pages"
import { component } from "blocks"
import { hot } from "react-hot-loader/root"

const styles = (theme: Theme) =>
    createStyles({
        content: {
            display: "flex",
            padding: theme.spacing(5),
            height: "100vh",
            width: "calc(100vw - (100vw - 100%))"
        }
    })

const PossiblyHotContent = component({
    name: "Content",
    styles
})(({ classes }) => {
    return (
        <div className={classes.content}>
            <PageRouter />
        </div>
    )
})

export const Content =
    process.env.NODE_ENV === "development"
        ? hot(PossiblyHotContent)
        : PossiblyHotContent
