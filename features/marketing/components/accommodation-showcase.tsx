import { Bath, BedDouble, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { accommodations } from "@/config/accommodations";

export function AccommodationShowcase() {
  return (
    <section id="accommodations" className="px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Accommodations
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Three ways to stay in Panajachel.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            Choose a private apartment, a spacious bungalow, or book both spaces
            together as Refugio Completo for families and small groups.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {accommodations.map((accommodation) => (
            <Card key={accommodation.id} className="overflow-hidden border-border/70">
              <div className="aspect-[4/3] bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--accent)))]" />

              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                    {accommodation.kind === "composed" ? "Combined stay" : "Private stay"}
                  </Badge>
                  <span className="text-sm font-semibold text-primary">
                    ${accommodation.baseNightlyPriceUsd}/night
                  </span>
                </div>

                <CardTitle>{accommodation.name.en}</CardTitle>
                <CardDescription className="leading-7">
                  {accommodation.shortDescription.en}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Separator className="mb-5" />
                <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
                    <UsersRound className="size-4 text-primary" aria-hidden="true" />
                    <span>{accommodation.maxGuests} guests</span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
                    <BedDouble className="size-4 text-primary" aria-hidden="true" />
                    <span>{accommodation.bedrooms} bedrooms</span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
                    <Bath className="size-4 text-primary" aria-hidden="true" />
                    <span>{accommodation.bathrooms} baths</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="text-sm text-muted-foreground">
                Preparation buffer: {accommodation.preparationBuffer.daysBefore} day
                {accommodation.preparationBuffer.daysBefore === 1 ? "" : "s"} before / {" "}
                {accommodation.preparationBuffer.daysAfter} day
                {accommodation.preparationBuffer.daysAfter === 1 ? "" : "s"} after.
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
