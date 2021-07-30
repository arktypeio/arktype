import React from "react"
import { Grid } from "@material-ui/core"
import { toGridProps, RowOrColumnProps } from "./RowOrColumn"

export type ColumnProps = RowOrColumnProps

export const Column = (props: ColumnProps) => (
    <Grid {...toGridProps("column", props)} />
)
