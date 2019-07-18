import React from "react"
import { Card as MuiCard, Theme } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"

const styles = (theme: Theme) =>
    createStyles({
        card: ({ height, width, padding }: CardProps) => ({
            padding: padding ? padding : theme.spacing(1),
            height: height,
            width: width,
            display: "flex",
            flexDirection: "column"
        }),
        root: {}
    })

export type CardProps = MuiCardProps & {
    rootClass?: string
    contentFrom?: Record<string, string | number>
    height?: number
    width?: number
    padding?: string | number
}

export const Card = component({
    name: "Card",
    defaultProps: {} as Partial<CardProps>,
    styles
})(({ children, classes, rootClass, contentFrom, ...rest }) => {
    return (
        <MuiCard className={classes.card} {...rest}>
            {children}
        </MuiCard>
    )
})
