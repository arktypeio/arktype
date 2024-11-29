import { defineDocs, defineConfig } from "fumadocs-mdx/config";

import { shikiConfig } from "./lib/shiki";

export const { docs, meta } = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: shikiConfig,
  },
});
