import { Card } from "@/components/ui/card";

interface FormPreviewProps {
  html: string;
}

export function FormPreview({ html }: FormPreviewProps) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-4">Preview</h3>
      <div className="border rounded-md p-4 bg-white" dangerouslySetInnerHTML={{ __html: html }} />
    </Card>
  );
}
