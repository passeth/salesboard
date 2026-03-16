import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentRow } from "@/types";

type OrderDocumentsProps = {
  documents: DocumentRow[];
};

export function OrderDocuments({ documents }: OrderDocumentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents available yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li key={document.id}>
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {document.file_name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
