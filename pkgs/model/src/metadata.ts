import { stepMetadata, testMetadata } from "."

export const metadata = {
    test: testMetadata,
    step: stepMetadata
}

export type Metadata = typeof metadata
export type MetadataKey = keyof Metadata
