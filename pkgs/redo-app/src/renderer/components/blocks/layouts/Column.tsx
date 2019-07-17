import React from "react"
import { Theme } from "@material-ui/core"

import { component } from "blocks"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"
import { createStyles } from "@material-ui/styles"

const styles = (theme: Theme) => createStyles({})

export type ColumnProps = Omit<RowOrColumnProps, "direction">

export const Column = component({
    name: "Column",
    styles,
    defaultProps: {} as Partial<ColumnProps>
})(({ classes, ...rest }) => {
    return <RowOrColumn direction="column" {...rest} />
})
