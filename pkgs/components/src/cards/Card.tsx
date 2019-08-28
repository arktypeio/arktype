import React, { FC } from "react"
import { Card as MuiCard } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"

export type CardProps = MuiCardProps

export const Card: FC<CardProps> = ({ style, ...rest }) => {
    return (
        <MuiCard
            style={{
                width: "fit-content",
                padding: 8,
                ...style
            }}
            {...rest}
        />
    )
}
