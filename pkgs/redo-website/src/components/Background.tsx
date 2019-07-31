import React from "react"
import { makeStyles, createStyles } from "@material-ui/styles"
import { Card } from "redo-components"
import { Theme } from "@material-ui/core"

const stylize = makeStyles<Theme>(theme => ({
    skewedBackground: {
        overflow: "hidden",
        width: "100vw",
        position: "absolute",
        top: -150,
        height: 375,
        background: theme.palette.background.paper,
        transform: "skewY(8deg)",
        transformOrigin: "top left"
    }
}))

export const Background = () => {
    const { skewedBackground } = stylize()
    return <Card elevation={20} className={skewedBackground} />
}
