/**
 * Chapter-specific option lists.
 *
 * These are placeholders until the real chapter lists arrive — edit this one file
 * and every dropdown, filter and directory facet follows. They are deliberately
 * plain text rather than database tables: they change once a year at most, and a
 * lookup table would buy nothing but joins.
 */

export const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Other",
] as const;

export const YEARS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
  { value: 5, label: "5th Year" },
] as const;

/**
 * Officer positions. Chapter-wide posts, held by a handful of people — most
 * members have none, which is why `designation` is optional on a profile.
 */
export const DESIGNATIONS = [
  "President",
  "Vice President",
  "General Secretary",
  "Treasurer",
  "Web Master",
  "Membership Chair",
  "Tech Supervisor",
] as const;

/** The teams members actually work in. Separate from officer posts, because an
 *  officer can also sit in a department and both need to be countable. */
export const DEPARTMENTS = [
  "AI/ML and Data Science",
  "Competitive Programming",
  "Cloud and DevOps",
  "Web Dev",
  "Cybersecurity",
  "Graphic Designing",
  "Content and Documentations",
  "Public Relations",
  "Event Management",
  "Advisors",
] as const;

/**
 * How a member is described in a list. An officer who also sits in a department
 * gets both; everyone else gets whichever they have. The database guarantees at
 * least one of the two on a complete profile, so the final fallback is only
 * reached mid-onboarding.
 */
export function roleLabel(
  designation?: string | null,
  department?: string | null,
): string {
  if (designation && department) return `${designation} · ${department}`;
  return designation ?? department ?? "No role yet";
}

export const PROFILE_STATUSES = ["pending", "approved", "rejected", "needs_info"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PROFICIENCIES = ["beginner", "intermediate", "advanced"] as const;
export type Proficiency = (typeof PROFICIENCIES)[number];

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Not approved",
  needs_info: "More info needed",
};
