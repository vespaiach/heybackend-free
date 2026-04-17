"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { type FormConfig, generateFormCode } from "./form-generator";
import { useHighlightedCode } from "./use-highlighted-code";

interface AIAssistantProps {
  websiteId: string;
}

type Step = 1 | 2 | 3;

interface FormAnswers {
  fields: "email-only" | "email-name" | null;
  successBehavior: {
    type: "redirect" | "message" | null;
    url?: string;
    message?: string;
  };
  errorMessage: string;
}

export function AIAssistant({ websiteId }: AIAssistantProps) {
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<FormAnswers>({
    fields: null,
    successBehavior: { type: null },
    errorMessage: "Failed to subscribe. Please try again.",
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const highlightedHtml = useHighlightedCode(generatedCode);

  const handleFieldsSelect = (value: "email-only" | "email-name") => {
    setAnswers((prev) => ({ ...prev, fields: value }));
    setStep(2);
  };

  const handleSuccessBehavior = (type: "redirect" | "message") => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { type },
    }));
    setStep(3);
  };

  const handleRedirectUrl = (url: string) => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { ...prev.successBehavior, url },
    }));
  };

  const handleSuccessMessage = (message: string) => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { ...prev.successBehavior, message },
    }));
  };

  const handleErrorMessage = (message: string) => {
    setAnswers((prev) => ({ ...prev, errorMessage: message }));
  };

  const handleComplete = () => {
    if (answers.fields && answers.successBehavior.type && answers.errorMessage) {
      const config: FormConfig = {
        websiteId,
        fields: answers.fields,
        successBehavior:
          answers.successBehavior.type === "redirect"
            ? { type: "redirect", url: answers.successBehavior.url || "/" }
            : { type: "message", message: answers.successBehavior.message || "Thanks!" },
        errorMessage: answers.errorMessage,
      };

      const code = generateFormCode(config);
      setGeneratedCode(code);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setAnswers({
      fields: null,
      successBehavior: { type: null },
      errorMessage: "Failed to subscribe. Please try again.",
    });
    setGeneratedCode(null);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="mb-4">
          <Badge variant="secondary">Step {step} of 3</Badge>
        </div>

        <div className="space-y-4 pr-4">
          {step >= 1 && (
            <div>
              <h3 className="font-semibold mb-4">Which fields do you need?</h3>
              <RadioGroup value={answers.fields || ""} onValueChange={handleFieldsSelect}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email-only" id="email-only" />
                  <Label htmlFor="email-only" className="font-normal cursor-pointer">
                    Email only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email-name" id="email-name" />
                  <Label htmlFor="email-name" className="font-normal cursor-pointer">
                    Email, First Name, Last Name
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step >= 2 && (
            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">On successful submission, what should happen?</h3>
              <RadioGroup
                value={answers.successBehavior.type || ""}
                onValueChange={(val) => handleSuccessBehavior(val as "redirect" | "message")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="redirect" id="redirect" />
                  <Label htmlFor="redirect" className="font-normal cursor-pointer">
                    Redirect to a URL
                  </Label>
                </div>
                {answers.successBehavior.type === "redirect" && (
                  <div>
                    <Input
                      placeholder="https://example.com/welcome"
                      value={answers.successBehavior.url || ""}
                      onChange={(e) => handleRedirectUrl(e.target.value)}
                      className="mt-2 ml-6 w-[95%]"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="message" id="message" />
                  <Label htmlFor="message" className="font-normal cursor-pointer">
                    Show inline message
                  </Label>
                </div>
                {answers.successBehavior.type === "message" && (
                  <Textarea
                    placeholder="Thanks for subscribing!"
                    value={answers.successBehavior.message || ""}
                    onChange={(e) => handleSuccessMessage(e.target.value)}
                    className="mt-2 ml-6 w-[95%]"
                  />
                )}
              </RadioGroup>
            </div>
          )}

          {step >= 3 && (
            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">What error message should users see?</h3>
              <Textarea
                value={answers.errorMessage}
                onChange={(e) => handleErrorMessage(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-2">{answers.errorMessage.length}/200</p>
            </div>
          )}
        </div>

        {step === 3 && (
          <div className="flex gap-2">
            <Button
              onClick={handleComplete}
              className="flex-1"
              disabled={!answers.successBehavior.url && answers.successBehavior.type === "redirect"}>
              {generatedCode ? "Regenerate" : "Generate Form"}
            </Button>
            {generatedCode && (
              <Button onClick={handleStartOver} variant="ghost">
                Start Over
              </Button>
            )}
          </div>
        )}
      </Card>

      {generatedCode ? (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">Your code is ready! 🎉</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Paste this into your website to start collecting subscribers.
            </p>
          </div>

          <ScrollArea className="h-80 mb-4">
            {highlightedHtml ? (
              <div
                className="text-xs [&_pre]:rounded-md [&_pre]:p-4"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-md text-xs">
                <code>{generatedCode}</code>
              </pre>
            )}
          </ScrollArea>

          <Button onClick={handleCopyCode} className="w-full">
            {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copiedCode ? "Copied!" : "Copy Code"}
          </Button>
        </Card>
      ) : (
        <div className="text-center text-muted-foreground flex items-center justify-center">
          <p className="text-sm">Answer the questions to preview your form here</p>
        </div>
      )}
    </div>
  );
}
