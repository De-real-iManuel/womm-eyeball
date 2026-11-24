// Eyeball's terminal mark: a symmetrical eye drawn in portable ASCII.
// Keep it readable at narrow terminal widths and safe for plain-text output.
const ART = [
  "       .-\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"-.",
  "    .-'                    '-.",
  "  .'      .------------.      '.",
  " /       /    .----.    \\       \\",
  "|       |    / .--. \\    |       |",
  "|       |   | | (o) | |   |       |",
  "|       |    \\ '----' /    |       |",
  " \\       \\    '------'    /       /",
  "  '.      '------------'      .'",
  "    '-.                    .-'",
  "       '-.______________.-'",
  "",
  "          E Y E B A L L",
  "      FRONTEND QUALITY ASSURANCE",
  "       Inspect what actually renders.",
];

export const banner = () => ART.join("\n");

/** Writes the banner to stderr only in interactive terminals. */
export function showBanner(stream = process.stderr) {
  if (!stream.isTTY) return;
  const color = !process.env.NO_COLOR && stream.hasColors?.();
  const out = color
    ? ART.map((line, i) => i === 12
      ? `\x1b[1;36m${line}\x1b[0m`
      : i === 13
        ? `\x1b[1m${line}\x1b[0m`
        : `\x1b[36m${line}\x1b[0m`).join("\n")
    : banner();
  stream.write(out + "\n\n");
}
