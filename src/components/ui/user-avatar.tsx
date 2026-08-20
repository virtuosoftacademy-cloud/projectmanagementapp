import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

/** shadcn Avatar with the workspace's initials fallback. */
export function UserAvatar({
  name,
  image,
  className,
  textClassName,
}: {
  name: string;
  image?: string | null;
  className?: string;
  textClassName?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className={cn("text-xs font-medium", textClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
