// Terminal banner: a stylized almond eye with lashes, iris and pupil.
// Plain ASCII, max 60 columns, readable with or without color.
// Printed to stderr and only on a terminal, so piped or machine-readable stdout stays clean.
const EYE = String.raw`
  \   \  \              _.-~~~~~~~~~~~~~~~-._
   \   \  \         _.-~'                   '~-._
 ---\   \  \    _.-~'      .-~~~~~~~-.         '~-._
 ----\   \  \.-'         .'  .-----.  '.           '-.
 -----\   <-'           /   ( (@@@) )   \             >
 ----/   / '-.          '.   '-----'   .'          .-'
 ---/   /      '-._       '-~~~~~~~-'          _.-~'
 --/   /           '-._                   _.-~'
 -/   /                 '~-.________..-~'
`.split("\n").slice(1, -1);
const TEXT = [
  "                 e y e b a l l",
  "       frontend QA that looks at your app",
  "      a WOMM tool (works on my machine)",
];

export const banner = () => [...EYE, "", ...TEXT].join("\n");

/** Writes the banner to stderr when it is a terminal. Color only if the terminal supports it and NO_COLOR is unset. */
export function showBanner(stream = process.stderr) {
  if (!stream.isTTY) return;
  const color = !process.env.NO_COLOR && stream.hasColors?.();
  const out = color ? [...EYE.map((l) => `\x1b[36m${l}\x1b[0m`), "", `\x1b[1m${TEXT[0]}\x1b[0m`, ...TEXT.slice(1)].join("\n") : banner();
  stream.write(out + "\n\n");
}