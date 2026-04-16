"use client";

import { useState } from "react";
import { RelativeDate } from "@/components/relative-date";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContactRequest } from "@/lib/domain/types";
import { ContactDetailModal } from "./contact-detail-modal";

interface ContactsTableProps {
  selectedWebsiteId: string;
  contacts: ContactRequest[];
  total: number;
  page: number;
  pageSize: number;
  availableCountries: string[];
}

export function ContactsTable({ contacts, total, page, pageSize }: ContactsTableProps) {
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Read Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="cursor-pointer hover:bg-gray-50">
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.company || "-"}</TableCell>
              <TableCell>{contact.country || "-"}</TableCell>
              <TableCell>
                <RelativeDate date={contact.createdAt} />
              </TableCell>
              <TableCell>
                {contact.readAt ? (
                  <Badge variant="secondary">
                    Read on <RelativeDate date={contact.readAt} />
                  </Badge>
                ) : (
                  <Badge variant="destructive">Unread</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          open={!!selectedContact}
          onOpenChange={(open) => {
            if (!open) setSelectedContact(null);
          }}
        />
      )}

      {/* Pagination info */}
      <div className="text-sm text-gray-600">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
      </div>
    </div>
  );
}
