import React from "react"
import { component } from "blocks"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"
import { createStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"

const styles = (theme: Theme) => createStyles({})

export type RowProps = Omit<RowOrColumnProps, "direction">

export const Row = component({
    name: "Row",
    styles,
    defaultProps: {} as Partial<RowProps>
})(({ classes, ...rest }) => {
    return <RowOrColumn direction="row" {...rest} />
})
