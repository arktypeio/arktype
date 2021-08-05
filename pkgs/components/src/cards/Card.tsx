import React from "react"
import { Merge } from "@re-do/utils"
import { Card as MuiCard } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"

export type CardProps = Merge<MuiCardProps, { sizeToContent?: boolean }>

export const Card = ({ style, sizeToContent, ...rest }: CardProps) => {
    return (
        <MuiCard
            style={{
                width: sizeToContent ? "max-content" : "auto",
                padding: 8,
                ...style
            }}
            {...rest}
        />
    )
}
