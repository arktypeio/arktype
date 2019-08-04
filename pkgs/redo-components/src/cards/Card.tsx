import React, { FC } from "react"
import { Card as MuiCard, Theme } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"
import { makeStyles } from "@material-ui/styles"

const stylize = makeStyles((theme: Theme) => ({
    card: ({ height, width, padding }: CardProps) => {
        return {
            padding: padding ? padding : theme.spacing(1),
            height: height,
            width: width,
            display: "flex",
            flexDirection: "column"
        }
    },
    root: {}
}))

export type CardProps = MuiCardProps & {
    rootClass?: string
    contentFrom?: Record<string, string | number>
    height?: number
    width?: number
    padding?: string | number
}

export const Card: FC<CardProps> = ({
    children,
    classes,
    rootClass,
    contentFrom,
    height,
    width,
    padding,
    ...rest
}) => {
    const { card } = stylize({ height: height, width: width, padding: padding })
    return (
        <MuiCard className={card} {...rest}>
            {children}
        </MuiCard>
    )
}
