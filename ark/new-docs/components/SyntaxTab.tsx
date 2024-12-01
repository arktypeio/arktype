import { Tab } from "fumadocs-ui/components/tabs";
import type { SyntaxKind } from "./utils.js";

export const SyntaxTab: React.FC<{ children: string; kind: SyntaxKind }> = ({
  children,
  kind,
}) => <Tab value={kind}>{children}</Tab>;
