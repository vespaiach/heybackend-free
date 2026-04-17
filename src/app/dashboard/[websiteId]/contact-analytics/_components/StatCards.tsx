import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  total: number;
  read: number;
  unread: number;
};

export function StatCards({ total, read, unread }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Read</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{read}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{unread}</p>
        </CardContent>
      </Card>
    </div>
  );
}
