import React, { FC } from "react"
import { Grid } from "@material-ui/core"
import { toGridProps, RowOrColumnProps } from "./RowOrColumn"

export type ColumnProps = RowOrColumnProps

export const Column: FC<ColumnProps> = props => (
    <Grid {...toGridProps("column", props)} />
)
