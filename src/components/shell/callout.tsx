/**
 * A message from an admin to a member.
 *
 * Jasmine, because it means the same thing here as it does on an open slot:
 * a person is waiting on you.
 */
export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-jasmine/30 bg-accent p-4 text-left">
      <p className="text-sm font-medium text-jasmine">{title}</p>
      <div className="mt-1 text-sm text-jasmine/85">{children}</div>
    </div>
  );
}
