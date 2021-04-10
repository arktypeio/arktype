import React from "react"
import { Card as MuiCard } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"

export type CardProps = { sizeToContent?: boolean } & MuiCardProps

export const Card = ({ style, sizeToContent, ...rest }: CardProps) => {
    return (
        <MuiCard
            style={{
                width: sizeToContent ? "max-content" : undefined,
                padding: 8,
                ...style
            }}
            {...rest}
        />
    )
}
