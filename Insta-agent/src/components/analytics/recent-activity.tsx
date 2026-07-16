import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RecentActivityItem } from "@/lib/analytics";

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <Card className="bg-card/60 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No activity yet.</p>
        ) : (
          <div className="max-h-[340px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/[0.06]">
                  <TableHead>Conversation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-white/[0.06]">
                    <TableCell className="font-medium text-foreground/90 whitespace-nowrap">
                      {item.conversationName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.role === "user"
                            ? "bg-[#fd1d1d]/15 text-[#fd1d1d] border-transparent"
                            : "bg-[#833ab4]/15 text-[#c084fc] border-transparent"
                        }
                      >
                        {item.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {item.content}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
