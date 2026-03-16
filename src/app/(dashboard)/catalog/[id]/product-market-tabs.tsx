"use client";

import type { ProductMarketContentRow } from "@/types/database";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function ProductMarketTabs({
  marketContents,
}: {
  marketContents: ProductMarketContentRow[];
}) {
  if (marketContents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market-Specific Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No market-specific content available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market-Specific Content</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={marketContents[0].country_code}>
          <TabsList>
            {marketContents.map((content) => (
              <TabsTrigger
                key={content.country_code}
                value={content.country_code}
              >
                {content.country_code}
              </TabsTrigger>
            ))}
          </TabsList>

          {marketContents.map((content) => (
            <TabsContent
              key={content.country_code}
              value={content.country_code}
              className="space-y-4 pt-4"
            >
              {content.local_product_name && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                    Local Product Name
                  </h4>
                  <p className="text-sm">{content.local_product_name}</p>
                </div>
              )}

              {content.ingredient_label && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                      Ingredients
                    </h4>
                    <ScrollArea className="max-h-40">
                      <p className="whitespace-pre-wrap text-sm">
                        {content.ingredient_label}
                      </p>
                    </ScrollArea>
                  </div>
                </>
              )}

              {content.usage_instructions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                      Usage
                    </h4>
                    <p className="whitespace-pre-wrap text-sm">
                      {content.usage_instructions}
                    </p>
                  </div>
                </>
              )}

              {content.precautions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                      Precautions
                    </h4>
                    <p className="whitespace-pre-wrap text-sm">
                      {content.precautions}
                    </p>
                  </div>
                </>
              )}

              {content.label_image_url && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                      Label Image
                    </h4>
                    <img
                      src={content.label_image_url}
                      alt={`${content.country_code} label`}
                      width={300}
                      height={200}
                      className="rounded-md border"
                    />
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
