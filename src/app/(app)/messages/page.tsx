import type { Metadata } from "next";
import { MessageCenter } from "@/components/messages/message-center";
import { getMembers, getMessages } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await requireUser("/messages");
  const [members, messages] = await Promise.all([
    getMembers(viewer.workspaceId),
    getMessages(viewer.workspaceId, viewer.id),
  ]);
  const contacts = members.filter((member) => member.id !== viewer.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Chat with your teammates.</p>
      </div>
      <MessageCenter contacts={contacts} messages={messages} />
    </div>
  );
}
