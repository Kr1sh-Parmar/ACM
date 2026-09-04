"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { SearchX, Send } from "lucide-react";
import { toast } from "sonner";
import { requestToJoin } from "@/lib/actions/teams";
import { SkillSlots } from "@/components/teams/skill-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { coverageRim } from "@/components/shell/coverage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type BrowsableTeam = {
  id: string;
  name: string;
  description: string | null;
  track: string | null;
  lead_id: string;
  members: { id: string; full_name: string }[];
  /** Non-ACM people on the team. They hold slots, so they belong in the count.  */
  guests: { id: string; full_name: string }[];
  required: string[];
  covered: string[];
  missing: string[];
  openSlots: number;
  isFull: boolean;
};

export function TeamBrowser({
  eventId,
  teams,
  currentMemberId,
  canRequest,
  requestedTeamIds,
}: {
  eventId: string;
  teams: BrowsableTeam[];
  currentMemberId: string;
  canRequest: boolean;
  requestedTeamIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [trackFilter, setTrackFilter] = useState("");
  const [requested, setRequested] = useState(new Set(requestedTeamIds));

  // Only skills teams are actually still missing are worth filtering by — that
  // is the question people arrive with ("who needs what I do?").
  const missingSkills = useMemo(
    () => [...new Set(teams.flatMap((t) => t.missing))].sort((a, b) => a.localeCompare(b)),
    [teams],
  );

  const tracks = useMemo(
    () => [...new Set(teams.map((t) => t.track).filter((t): t is string => Boolean(t)))].sort(),
    [teams],
  );

  const visible = teams.filter((team) => {
    if (query && !team.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (skillFilter && !team.missing.includes(skillFilter)) return false;
    if (onlyOpen && team.isFull) return false;
    if (trackFilter && team.track !== trackFilter) return false;
    return true;
  });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a team by name"
          className="max-w-56"
          aria-label="Find a team by name"
        />

        <NativeSelect
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="w-auto"
          aria-label="Filter by a skill the team still needs"
        >
          <option value="">Needs any skill</option>
          {missingSkills.map((skill) => (
            <option key={skill} value={skill}>
              Needs {skill}
            </option>
          ))}
        </NativeSelect>

        {tracks.length > 0 && (
          <NativeSelect
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="w-auto"
            aria-label="Filter by track"
          >
            <option value="">Any track</option>
            {tracks.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </NativeSelect>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-acm-500"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Has open slots
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-jasmine/25 bg-white/2 py-14 text-center">
          <SearchX className="mx-auto size-7 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-heading font-semibold">No teams match that</p>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {visible.map((team) => {
            const onIt = team.members.some((m) => m.id === currentMemberId);
            return (
              // The rim warms toward jasmine as this team's skill coverage
              // drops, so a short-staffed team stands out across the grid.
              <li
                key={team.id}
                className="glass rim flex flex-col rounded-2xl p-5 shadow-glow-md"
                style={coverageRim(team.covered.length, team.required.length)}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/events/${eventId}/teams/${team.id}`}
                    className="font-heading text-lg font-semibold hover:text-acm-200"
                  >
                    {team.name}
                  </Link>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      team.isFull ? "text-muted-foreground" : "text-jasmine"
                    }`}
                  >
                    {team.isFull ? "Full" : `${team.openSlots} open`}
                  </span>
                </div>

                {team.track && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{team.track}</p>
                )}

                {team.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {team.description}
                  </p>
                )}

                <div className="mt-4">
                  <SkillSlots
                    required={team.required}
                    covered={new Set(team.covered)}
                    limit={5}
                  />
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 pt-1">
                  <ul className="flex -space-x-2">
                    {team.members.slice(0, 5).map((member) => (
                      <li key={member.id} title={member.full_name}>
                        <Link href={`/directory/${member.id}`} className="block">
                          <MemberAvatar
                            id={member.id}
                            name={member.full_name}
                            className="size-7 border-2 border-card"
                          />
                        </Link>
                      </li>
                    ))}

                    {/* Guests fill the rest of the stack, up to the same five.
                        No profile behind them, so nothing to link to. */}
                    {team.guests.slice(0, Math.max(0, 5 - team.members.length)).map((guest) => (
                      <li key={guest.id} title={guest.full_name}>
                        <MemberAvatar
                          id={guest.id}
                          name={guest.full_name}
                          className="size-7 border-2 border-card"
                        />
                      </li>
                    ))}
                  </ul>

                  {onIt ? (
                    <span className="font-mono text-xs text-muted-foreground">You&apos;re on this</span>
                  ) : requested.has(team.id) ? (
                    <span className="font-mono text-xs text-muted-foreground">Request sent</span>
                  ) : canRequest && !team.isFull ? (
                    <JoinDialog
                      eventId={eventId}
                      team={team}
                      onSent={() => setRequested((prev) => new Set(prev).add(team.id))}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function JoinDialog({
  eventId,
  team,
  onSent,
}: {
  eventId: string;
  team: BrowsableTeam;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Ask to join
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask to join {team.name}</DialogTitle>
          <DialogDescription>
            {team.missing.length > 0
              ? `They still need ${team.missing.join(", ")}. Say what you'd bring.`
              : "Say a line about what you'd bring to the team."}
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await requestToJoin(formData);
              if (result?.error) toast.error(result.error);
              else {
                toast.success(`Request sent to ${team.name}.`);
                onSent();
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="team_id" value={team.id} />
          <input type="hidden" name="event_id" value={eventId} />

          <Textarea
            name="message"
            rows={3}
            maxLength={300}
            placeholder="I've built two Next.js apps and can take the frontend."
          />

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              <Send className="size-4" aria-hidden />
              {pending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
