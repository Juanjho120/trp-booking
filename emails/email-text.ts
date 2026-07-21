export type PlainTextRow = Readonly<{
  label: string;
  value: string;
}>;

function compactLines(lines: readonly (string | null | undefined)[]): string[] {
  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
}

export function buildPlainTextRows(rows: readonly PlainTextRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}

export function buildPlainTextEmail(
  sections: readonly (string | null | undefined)[],
): string {
  return `${compactLines(sections).join("\n\n")}\n`;
}
