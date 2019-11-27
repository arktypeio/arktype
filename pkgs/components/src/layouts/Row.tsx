import React from "react"
import { Grid } from "@material-ui/core"
import { RowOrColumnProps, toGridProps } from "./RowOrColumn"

export type RowProps = RowOrColumnProps

export const Row = (props: RowProps) => <Grid {...toGridProps("row", props)} />
