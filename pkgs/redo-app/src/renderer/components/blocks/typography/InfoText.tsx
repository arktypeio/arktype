import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { component, Row } from "blocks"
import { createStyles } from "@material-ui/styles"

const styles = (theme: Theme) =>
    createStyles({
        row: {
            justifyContent: "space-around"
        }
    })

export type InfoTextProps = {
    children: string
}

export const InfoText = component({
    name: "InfoText",
    defaultProps: {} as Partial<InfoTextProps>,
    styles
})(({ classes, children }) => {
    return <Typography align="center">{children}</Typography>
})
