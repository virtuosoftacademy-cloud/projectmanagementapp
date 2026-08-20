import type { Person } from "@/lib/domain";
import { initials } from "@/lib/utils";

/** Overlapping avatars. Takes resolved people so it never needs a data lookup. */
export function AvatarStack({ people, max = 5 }: { people: Person[]; max?: number }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex -space-x-2">
      {shown.map((person) => (
        <span
          key={person.id}
          title={person.name}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[10px] font-medium text-primary"
        >
          {initials(person.name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
