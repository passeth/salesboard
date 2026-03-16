import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceRow } from "@/types";

type OrderInvoiceProps = {
  invoices: InvoiceRow[];
};

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

export function OrderInvoice({ invoices }: OrderInvoiceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices available yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Invoice No:</span> {invoice.invoice_no}
                </p>
                <p>
                  <span className="text-muted-foreground">Payment Status:</span>{" "}
                  <span className="capitalize">{invoice.payment_status}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  {formatCurrency(invoice.total_amount, invoice.currency_code)}
                </p>
                {invoice.subtotal_amount !== invoice.total_amount ? (
                  <p>
                    <span className="text-muted-foreground">Subtotal:</span>{" "}
                    {formatCurrency(invoice.subtotal_amount, invoice.currency_code)}
                  </p>
                ) : null}
                <p className="md:col-span-2">
                  <span className="text-muted-foreground">Due Date:</span> {formatDate(invoice.due_date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
