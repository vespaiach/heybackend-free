"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContactRequest } from "@/lib/domain/types";
import { markContactAsRead } from "../actions";

interface ContactDetailModalProps {
  contact: ContactRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsRead = async () => {
    setIsLoading(true);
    try {
      const result = await markContactAsRead(contact.id);
      if (!result.error) {
        router.refresh();
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold">{contact.name}</h2>
            <p className="text-sm text-gray-600">{contact.email}</p>
            {contact.company && <p className="text-sm text-gray-600">{contact.company}</p>}
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-2 font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contact.phone && (
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p>{contact.phone}</p>
                </div>
              )}
              {contact.email && (
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p>{contact.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="mb-2 font-semibold">Message</h3>
            <p className="whitespace-pre-wrap text-sm">{contact.message}</p>
          </div>

          {/* Location & Metadata */}
          <div>
            <h3 className="mb-2 font-semibold">Location & Device</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contact.country && (
                <div>
                  <span className="text-gray-600">Country:</span>
                  <p>{contact.country}</p>
                </div>
              )}
              {contact.region && (
                <div>
                  <span className="text-gray-600">Region:</span>
                  <p>{contact.region}</p>
                </div>
              )}
              {contact.city && (
                <div>
                  <span className="text-gray-600">City:</span>
                  <p>{contact.city}</p>
                </div>
              )}
              {contact.timezone && (
                <div>
                  <span className="text-gray-600">Timezone:</span>
                  <p>{contact.timezone}</p>
                </div>
              )}
              {contact.os && (
                <div>
                  <span className="text-gray-600">OS:</span>
                  <p>{contact.os}</p>
                </div>
              )}
              {contact.deviceType && (
                <div>
                  <span className="text-gray-600">Device:</span>
                  <p>{contact.deviceType}</p>
                </div>
              )}
              {contact.browser && (
                <div>
                  <span className="text-gray-600">Browser:</span>
                  <p>{contact.browser}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mark as Read */}
          <div className="border-t pt-4">
            {contact.readAt ? (
              <p className="text-sm text-gray-600">
                Read on {contact.readAt.toLocaleDateString()} at {contact.readAt.toLocaleTimeString()}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleMarkAsRead}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? "Marking..." : "Mark as Read"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
