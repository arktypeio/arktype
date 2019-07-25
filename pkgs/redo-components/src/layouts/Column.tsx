import React from "react"
import { Theme } from "@material-ui/core"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"
import { createStyles } from "@material-ui/styles"

const styles = (theme: Theme) => createStyles({})

export type ColumnProps = Omit<RowOrColumnProps, "direction">

export const Column = ({ classes, ...rest }: ColumnProps) => {
    return <RowOrColumn direction="column" {...rest} />
}
