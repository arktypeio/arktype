import React from "react"
import { Tooltip } from "@material-ui/core"
import { TooltipProps } from "@material-ui/core/Tooltip"
import { listify, ValueFrom } from "@re-do/utils"
import { Text, TextProps } from "./Text"
import { usePalette, makeStyles, Theme } from "../styles"

const stylize = makeStyles((theme: Theme) => ({
    tooltip: {
        backgroundColor: "white",
        border: "2px solid black"
    }
}))

export type ErrorTextProps = TextProps & {
    children: string | string[]
    tooltipPlacement?: ValueFrom<TooltipProps, "placement">
    tooltipProps?: TooltipProps
}

export const ErrorText = ({
    children,
    tooltipPlacement,
    tooltipProps,
    ...rest
}: ErrorTextProps) => {
    const { tooltip } = stylize()
    const { error } = usePalette()
    const messages = (listify(children) as string[]).filter(
        child => !!child.trim()
    )
    return (
        <Tooltip
            classes={{
                tooltip
            }}
            title={messages.map((message, index) => (
                <Text
                    key={index}
                    variant="caption"
                    style={{ color: error.main }}
                >{`🤔${message}\n`}</Text>
            ))}
            placement={tooltipPlacement}
            {...tooltipProps}
        >
            <div
                style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%"
                }}
            >
                <Text
                    variant="caption"
                    style={{
                        color: error.main
                    }}
                    noWrap
                    {...rest}
                >
                    {messages.length > 1
                        ? `🤯${messages[0]} (and more...)`
                        : `🤔${messages[0]}`}
                </Text>
            </div>
        </Tooltip>
    )
}
