import React, { FC } from "react"
import { Container, ContainerProps } from "./Container"

export type ColumnProps = Omit<ContainerProps, "direction">

export const Column: FC<ColumnProps> = props => (
    <Container direction="column" {...props} />
)
