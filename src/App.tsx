import { useState } from "react";
import { DateBar } from "./components/DateBar";
import { GroupSection } from "./components/GroupSection";
import { ThemeToggle } from "./components/ThemeToggle";
import { UnitToggle } from "./components/UnitToggle";
import { Button, Input } from "./components/ui";
import { useGym } from "./lib/store";
import { useTheme } from "./lib/theme";
import { ActiveDateContext, useResolvedActiveDate } from "./lib/activeDate";
import { UnitContext, useUnitSystem } from "./lib/units";

export default function App() {
  const { theme, setTheme } = useTheme();
  const { system, setSystem } = useUnitSystem();
  const gym = useGym();

  // Expansion and editing live here, not in the row: moving a tracker to
  // another group re-parents it, and row-local state would be lost.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Never persisted: a reload always lands back on today.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const active = useResolvedActiveDate(pickedDate);

  return (
    <UnitContext.Provider value={system}>
      <ActiveDateContext.Provider value={active}>
        <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-16 pt-6">
          <header className="mb-4 flex items-center gap-2 border-b-2 border-ink pb-4">
            <h1 className="mr-auto text-lg font-bold uppercase tracking-[0.12em]">
              OpenLog
            </h1>
            <UnitToggle system={system} onChange={setSystem} />
            <ThemeToggle theme={theme} onChange={setTheme} />
          </header>

          <DateBar
            date={active.date}
            isToday={active.isToday}
            onChange={setPickedDate}
          />

          {!gym.ready ? (
            <p className="text-sm text-ink/50">Loading…</p>
          ) : (
            // Scroll anchoring fights the deliberate scrolling below: collapsing
          // a card shifts the page under the one just opened.
          <main className="space-y-8 [overflow-anchor:none]">
              {gym.groups.map((group, index) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  trackers={gym.trackersByGroup.get(group.id) ?? []}
                  entriesByTracker={gym.entriesByTracker}
                  expandedId={expandedId}
                  editingId={editingId}
                  isFirstGroup={index === 0}
                  isLastGroup={index === gym.groups.length - 1}
                  onExpand={setExpandedId}
                  onEditing={setEditingId}
                  onRename={(name) => gym.renameGroup(group.id, name)}
                  onRemove={() => gym.removeGroup(group.id)}
                  onMove={(direction) => gym.moveGroup(group.id, direction)}
                  onAddTracker={(values) => gym.addTracker(group.id, values)}
                  onUpdateTracker={(id, values) =>
                    gym.updateTracker(id, values)
                  }
                  onRemoveTracker={(id) => gym.removeTracker(id)}
                  onMoveTracker={(id, direction) =>
                    gym.moveTracker(id, direction)
                  }
                  onLog={(id, variant, values) =>
                    gym.logEntry(id, variant, values, pickedDate)
                  }
                  onRemoveEntry={(id) => gym.removeEntry(id)}
                />
              ))}

              {gym.groups.length === 0 && (
                <p className="text-sm text-ink/50">
                  Nothing here yet. Add your first group below.
                </p>
              )}

              {addingGroup ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!groupName.trim()) return;
                    gym.addGroup(groupName);
                    setGroupName("");
                    setAddingGroup(false);
                  }}
                >
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Monday Gym, Climbing, Body…"
                    aria-label="New group name"
                    autoFocus
                  />
                  <Button type="submit" variant="solid" size="md">
                    Add
                  </Button>
                  <Button
                    size="md"
                    onClick={() => {
                      setGroupName("");
                      setAddingGroup(false);
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setAddingGroup(true)}
                >
                  + Add group
                </Button>
              )}
            </main>
          )}
        </div>
      </ActiveDateContext.Provider>
    </UnitContext.Provider>
  );
}
