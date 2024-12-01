import { promises as fs } from "fs";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { highlight } from "fumadocs-core/server";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { getSingletonHighlighter, bundledLanguages } from "shiki";
import { shikiConfig } from "@/lib/shiki";
import { cn } from "fumadocs-ui/components/api";

export const CodeSnippet: React.FC<{
  filename: string;
  /** @default "ts" */
  lang?: string;
}> = async ({ filename, lang = "ts" }) => {
  const codeText = await fs.readFile(
    process.cwd() + "/components/code-snippets/snippets/" + filename,
    "utf8"
  );

  return <HighlightedCode lang={lang} code={codeText} />;
};

export const HighlightedCode: React.FC<{
  /** @default "ts" */
  lang?: string;
  code: string;
}> = async ({ lang = "ts", code }) => {
  // preload languages for shiki
  // https://github.com/fuma-nama/fumadocs/issues/1095
  await getSingletonHighlighter({
    langs: Object.keys(bundledLanguages),
  });

  const rendered = await highlight(code, {
    ...shikiConfig,
    meta: {
      __raw: "twoslash",
    },
    lang,
    components: {
      // rounded none is for syntax tabs
      pre: ({ className, children, ...props }) => (
        <Pre className={cn(className, "!rounded-none")} {...props}>
          {children}
        </Pre>
      ),
      // @ts-expect-error -- JSX component
      Popup,
      PopupContent,
      PopupTrigger,
    },
  });

  return <CodeBlock keepBackground>{rendered}</CodeBlock>;
};
