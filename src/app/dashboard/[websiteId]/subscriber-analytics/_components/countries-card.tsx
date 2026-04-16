"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countryFlag } from "./country-flag";

interface CountryRow {
  country: string;
  count: number;
}

interface CountriesCardProps {
  countries: CountryRow[];
}

function CountryList({ rows }: { rows: CountryRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map(({ country, count }) => (
        <li key={country} className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <span className="text-lg leading-none">{countryFlag(country)}</span>
            <span>{country}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

export function CountriesCard({ countries }: CountriesCardProps) {
  const [open, setOpen] = useState(false);
  const top5 = countries.slice(0, 5);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Subscribers by Country</CardTitle>
          </div>
          {countries.length > 5 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
            >
              View All <span aria-hidden>›</span>
            </button>
          )}
        </CardHeader>
        <CardContent className="flex-1">
          {countries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location data yet</p>
          ) : (
            <CountryList rows={top5} />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Countries</DialogTitle>
          </DialogHeader>
          <CountryList rows={countries} />
        </DialogContent>
      </Dialog>
    </>
  );
}
