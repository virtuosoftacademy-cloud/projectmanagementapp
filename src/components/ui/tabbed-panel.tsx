"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type TabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

/** shadcn Tabs driven by an items array, since every screen here uses that shape. */
export function TabbedPanel({
  items,
  defaultValue,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Tabs defaultValue={defaultValue ?? items[0].value} className={cn("w-full", className)}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="mt-6">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
