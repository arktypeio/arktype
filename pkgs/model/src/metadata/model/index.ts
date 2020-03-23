import { ModelMetadata } from "./metadata"
import { Selector } from "./selector"
import { Step } from "./step"
import { Tag } from "./tag"
import { Test } from "./test"
import { User } from "./user"
export * from "./metadata"

export const model: ModelMetadata = {
    Selector,
    Step,
    Tag,
    Test,
    User,
}
