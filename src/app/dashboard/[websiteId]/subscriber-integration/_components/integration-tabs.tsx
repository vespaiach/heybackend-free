"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAssistant } from "./ai-assistant";
import { CodeSnippets } from "./code-snippets";

interface IntegrationTabsProps {
  websiteId: string;
}

export function IntegrationTabs({ websiteId }: IntegrationTabsProps) {
  const [activeTab, setActiveTab] = useState("ai");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="ai">Building Assistant</TabsTrigger>
        <TabsTrigger value="snippets">Code Snippets</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Build Your Form</h2>
            <p className="text-sm text-muted-foreground">
              A guided wizard that walks you through 3 quick steps — pick your fields, choose what happens on
              success, and set an error message. We'll generate custom code based on your answers!
            </p>
          </div>
          <AIAssistant websiteId={websiteId} />
        </div>
      </TabsContent>

      <TabsContent value="snippets" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Ready-Made Templates</h2>
            <p className="text-sm text-muted-foreground">
              Pre-built templates covering all field and behavior combos — just pick one, copy the code, and
              paste it into your site. Four ready-to-go snippets to get you started in seconds!
            </p>
          </div>
          <CodeSnippets websiteId={websiteId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
