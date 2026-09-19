import type { Subtask, TaskStatus } from "@/lib/domain";

/**
 * Turning a task's flat list of subtasks into the tree the UI and analytics
 * work with.
 *
 * Subtasks are stored flat — each row knows its `parentId` — and loaded in one
 * query per task, so the shape is rebuilt here rather than by recursive
 * queries. Pure and client-safe: the tree component and the analytics page run
 * the same code, so a branch's totals cannot disagree between the two.
 */

/** What a branch adds up to: the node itself plus everything beneath it. */
export type SubtaskRollup = {
  /** Minutes logged on this node and all of its descendants. */
  trackedMinutes: number;
  /** Estimates of this node and all of its descendants. */
  estimateMinutes: number;
  /** Descendants, not counting the node itself. */
  descendants: number;
  /** Of those descendants, how many are done. */
  descendantsDone: number;
};

export type SubtaskNode = Subtask & {
  depth: number;
  children: SubtaskNode[];
  rollup: SubtaskRollup;
};

const byPosition = (a: Subtask, b: Subtask) => a.position - b.position;

/**
 * Builds the tree, top-level subtasks first, each level ordered by position.
 *
 * A node whose parent is missing is shown at the top level rather than lost.
 * That should not happen — a branch is deleted whole — but the database link
 * is SetNull, so it is the state a partial failure would leave behind.
 */
export function buildSubtaskTree(items: Subtask[]): SubtaskNode[] {
  const ids = new Set(items.map((item) => item.id));
  const childrenOf = new Map<string | null, Subtask[]>();

  for (const item of items) {
    const parent = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    const siblings = childrenOf.get(parent) ?? [];
    siblings.push(item);
    childrenOf.set(parent, siblings);
  }

  // `seen` guards against a cycle in bad data, which would otherwise recurse
  // forever. The app never creates one: a parent is fixed at creation.
  const seen = new Set<string>();

  function build(item: Subtask, depth: number): SubtaskNode {
    seen.add(item.id);
    const children = (childrenOf.get(item.id) ?? [])
      .filter((child) => !seen.has(child.id))
      .sort(byPosition)
      .map((child) => build(child, depth + 1));

    const rollup = children.reduce<SubtaskRollup>(
      (sum, child) => ({
        trackedMinutes: sum.trackedMinutes + child.rollup.trackedMinutes,
        estimateMinutes: sum.estimateMinutes + child.rollup.estimateMinutes,
        descendants: sum.descendants + 1 + child.rollup.descendants,
        descendantsDone:
          sum.descendantsDone + (child.status === "done" ? 1 : 0) + child.rollup.descendantsDone,
      }),
      {
        trackedMinutes: item.trackedMinutes,
        estimateMinutes: item.estimateMinutes,
        descendants: 0,
        descendantsDone: 0,
      },
    );

    return { ...item, depth, children, rollup };
  }

  return (childrenOf.get(null) ?? []).sort(byPosition).map((item) => build(item, 0));
}

/** Every node in the tree, parents before their children — the order shown. */
export function flattenTree(nodes: SubtaskNode[]): SubtaskNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/**
 * The ids of a subtask and everything beneath it — what deleting it removes.
 * Walks the flat list, so it works on the server without building the tree.
 */
export function subtreeIds(items: Pick<Subtask, "id" | "parentId">[], rootId: string): string[] {
  const result = [rootId];
  for (let index = 0; index < result.length; index += 1) {
    for (const item of items) {
      if (item.parentId === result[index] && !result.includes(item.id)) result.push(item.id);
    }
  }
  return result;
}

/**
 * A subtask's name with its ancestors, like `Pricing table › Stripe checkout`,
 * so an entry logged deep in a branch still says where it belongs.
 */
export function subtaskPath(items: Pick<Subtask, "id" | "parentId" | "title">[], id: string) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const parts: string[] = [];
  let current = byId.get(id);
  while (current && parts.length < 50) {
    parts.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(" › ");
}

/** How many subtasks sit in each status, every level counted. */
export function countByStatus(items: Pick<Subtask, "status">[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, "in-progress": 0, "in-review": 0, done: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}
