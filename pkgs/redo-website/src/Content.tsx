import "typeface-ubuntu"
import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp } from "./components"

const stylize = makeStyles<Theme>(theme => ({
    content: {
        position: "absolute",
        padding: theme.spacing(5),
        top: 0,
        height: "100vh",
        width: "100vw"
    }
}))

export const Content = () => {
    const { content } = stylize()
    return (
        <Column className={content} align="center">
            <AppHeader />
            <HowItWorks />
            <SignUp />
        </Column>
    )
}
