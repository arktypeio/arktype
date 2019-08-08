import React, { FC } from "react"
import { Grid } from "@material-ui/core"
import { RowOrColumnProps, toGridProps } from "./RowOrColumn"

export type RowProps = RowOrColumnProps

export const Row: FC<RowProps> = props => (
    <Grid {...toGridProps("row", props)} />
)
