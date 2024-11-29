import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/app/layout.config";
import { FloatYourBoat } from "@/components/FloatYourBoat";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <HomeLayout
      {...baseOptions}
      nav={{ ...baseOptions.nav, children: <FloatYourBoat /> }}
    >
      {children}
    </HomeLayout>
  );
}
