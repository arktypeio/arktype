import React, { FC } from "react"
import { Container, ContainerProps } from "./Container"

export type RowProps = Omit<ContainerProps, "direction">

export const Row: FC<RowProps> = props => (
    <Container direction="row" {...props} />
)
