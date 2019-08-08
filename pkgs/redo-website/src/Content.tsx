import "typeface-ubuntu"
import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme, Box } from "@material-ui/core"
import { Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"

const stylize = makeStyles((theme: Theme) => ({
    content: {
        position: "absolute",
        padding: theme.spacing(2),
        top: 0
    }
}))

export const Content = () => {
    const { content } = stylize()
    return (
        <Column className={content}>
            <AppHeader />
            <SubHeader />
            <HowItWorks />
            <SignUp />
        </Column>
    )
}
