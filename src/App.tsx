import { useState } from "react";
import { AppMenu } from "./components/AppMenu";
import { DatePicker } from "./components/DatePicker";
import { GroupSection } from "./components/GroupSection";
import { LogoMark } from "./components/icons";
import { Onboarding } from "./components/Onboarding";
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

  // The plan builder is the empty plan's screen, and the only way into it:
  // a new plan means clearing the old one first. Skipping it shows the empty
  // plan instead, until the plan is cleared again.
  const [skippedBuilder, setSkippedBuilder] = useState(false);

  // Never persisted: a reload always lands back on today.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const active = useResolvedActiveDate(pickedDate);

  const showBuilder = gym.groups.length === 0 && !skippedBuilder;
  // The day being logged into means nothing without a plan on screen to log.
  const showPlan = gym.ready && !showBuilder && gym.groups.length > 0;

  return (
    <UnitContext.Provider value={system}>
      <ActiveDateContext.Provider value={active}>
        <div className="min-h-dvh">
          {/* Outside the content column so the bar spans the window, and
              sticky as one piece: the day being logged into has to stay on
              screen, and it lives beside the wordmark. */}
          <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
            {/* The bar spans the window and its contents run much wider than
                the body — a toolbar, not a column heading. */}
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-3">
              <h1 className="mr-auto flex items-center gap-2 text-lg font-bold uppercase tracking-[0.12em]">
                <LogoMark />
                OpenLog
              </h1>
              {showPlan && (
                <DatePicker
                  date={active.date}
                  isToday={active.isToday}
                  onChange={setPickedDate}
                />
              )}
              <AppMenu
                theme={theme}
                onTheme={setTheme}
                system={system}
                onSystem={setSystem}
                snapshot={gym.snapshot}
                onReplaceAll={async (data) => {
                  await gym.replaceAll(data);
                  // Cleared: offer the builder again even if it was skipped.
                  if (data.groups.length === 0) setSkippedBuilder(false);
                }}
              />
            </div>
          </header>

          <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-6">
            {!gym.ready ? (
              <p className="text-sm text-ink/50">Loading…</p>
            ) : showBuilder ? (
              <Onboarding
                system={system}
                onUse={(records) => gym.replaceAll({ ...records, entries: [] })}
                onRestore={gym.replaceAll}
                onClose={() => setSkippedBuilder(true)}
              />
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
                    onArchiveTracker={(id) => gym.archiveTracker(id)}
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
                    Nothing here yet. Add your first group below, or{" "}
                    {/* Kept with its full stop, which would otherwise wrap alone. */}
                    <span className="whitespace-nowrap">
                      <Button
                        variant="link"
                        onClick={() => setSkippedBuilder(false)}
                      >
                        build a plan with AI
                      </Button>
                      .
                    </span>
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
        </div>
      </ActiveDateContext.Provider>
    </UnitContext.Provider>
  );
}
