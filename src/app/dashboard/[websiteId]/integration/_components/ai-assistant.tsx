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

  const handleFieldsSelect = (value: "email-only" | "email-name") => {
    setAnswers((prev) => ({ ...prev, fields: value }));
    setStep(2);
  };

  const handleSuccessBehavior = (type: "redirect" | "message") => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { type },
    }));
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

  if (generatedCode) {
    return (
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="font-semibold">You're all set! 🎉</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Copy the code below and paste it into your website. The form will start collecting subscribers.
          </p>
        </div>

        <div className="space-y-2 text-sm mb-6">
          <p className="font-medium">Your setup:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Fields: {answers.fields === "email-only" ? "Email only" : "Email, First Name, Last Name"}</li>
            <li>
              Success:{" "}
              {answers.successBehavior.type === "redirect"
                ? `Redirect to ${answers.successBehavior.url}`
                : "Show inline message"}
            </li>
          </ul>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Code</p>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs">
            <code>{generatedCode}</code>
          </pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopyCode} className="flex-1">
            {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copiedCode ? "Copied!" : "Copy Code"}
          </Button>
          <Button onClick={handleStartOver} variant="outline" className="flex-1">
            Create Another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="mb-4">
          <Badge variant="secondary">Step {step} of 3</Badge>
        </div>

        <ScrollArea className="h-96 mb-6">
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
                    <Input
                      placeholder="https://example.com/welcome"
                      value={answers.successBehavior.url || ""}
                      onChange={(e) => handleRedirectUrl(e.target.value)}
                      className="mt-2 ml-6"
                    />
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
                      className="mt-2 ml-6"
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
        </ScrollArea>

        {step === 3 && (
          <Button
            onClick={handleComplete}
            className="w-full"
            disabled={!answers.successBehavior.url && answers.successBehavior.type === "redirect"}>
            Generate Form
          </Button>
        )}
      </Card>

      <div className="text-center text-muted-foreground">
        <p className="text-sm">Answer the questions to preview your form here</p>
      </div>
    </div>
  );
}
