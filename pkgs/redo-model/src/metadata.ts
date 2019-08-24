import { browserEventMetadata, testMetadata } from "."

export const metadata = {
    test: testMetadata,
    browserEvent: browserEventMetadata
}

export type Metadata = typeof metadata
export type MetadataKey = keyof Metadata
