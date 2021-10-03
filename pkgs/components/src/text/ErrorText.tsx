import React from "react"
import { Tooltip } from "@material-ui/core"
import { TooltipProps } from "@material-ui/core/Tooltip"
import { makeStyles } from "@material-ui/styles"
import { listify, Merge } from "@re-do/utils"
import { Text, TextProps } from "./Text.js"
import { usePalette, Theme } from "../styles"

const stylize = makeStyles((theme: Theme) => ({
    tooltip: {
        backgroundColor: "white",
        border: "2px solid black"
    }
}))

export type TooltipPlacement = TooltipProps["placement"]

export type ErrorTextProps = Merge<
    TextProps,
    {
        children: string | string[]
        tooltipPlacement?: TooltipPlacement
        tooltipProps?: TooltipProps
    }
>

export const ErrorText = ({
    children,
    tooltipPlacement,
    tooltipProps,
    ...rest
}: ErrorTextProps) => {
    const { tooltip } = stylize()
    const { error } = usePalette()
    const messages = listify(children)
    return (
        <Tooltip
            classes={{
                tooltip
            }}
            title={messages.map((message, index) => (
                <>
                    <Text
                        key={index}
                        variant="caption"
                        style={{ color: error.main }}
                    >{`🤔 ${message}`}</Text>
                    <br />
                </>
            ))}
            // TODO: Figure out a better way to accomodate TS's "exactOptionalPropertyTypes" in React components
            // https://github.com/re-do/redo/issues/277
            placement={tooltipPlacement}
            {...tooltipProps}
        >
            <div
                style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis"
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
                        ? `🤯 ${messages[0]} (and more...)`
                        : `🤔 ${messages[0]}`}
                </Text>
            </div>
        </Tooltip>
    )
}
