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
        <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        <TabsTrigger value="snippets">Code Snippets</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Build Your Form</h2>
            <p className="text-sm text-muted-foreground">
              Answer a few questions and we'll generate the code for your subscriber form.
            </p>
          </div>
          <AIAssistant websiteId={websiteId} />
        </div>
      </TabsContent>

      <TabsContent value="snippets" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Ready-Made Templates</h2>
            <p className="text-sm text-muted-foreground">Pick a template and copy the code directly.</p>
          </div>
          <CodeSnippets websiteId={websiteId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
