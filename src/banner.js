// Eyeball's terminal mark is converted from the supplied eye artwork.
// The 60-column raster keeps the detailed iris and eyelids readable in standard terminals.
const ART = [
  "                      :  ::   =   -   .",
  "               =  .+  *= =%. +@. +@ .#: .+   -",
  "         .  ::.=#*=#@*#@%%@@%@@@@@@%@@*#@+=*+:.:.  .",
  "      ...-+**#@%%###%%%##**++*-*+**##%@%#*%@#%%*+==:..",
  "   .-+##%%#*+-:.-#@#*=-.  :.-:: . .:=*#@#: :-+*%%%#*=:",
  " -*##*=:      =@%+-:  .*%@@@@-.:*:  .-*%@:     .-+#%#+.",
  ":*##+          %@+-:.  -@@@@@@@@@@-  .:-*@+         .###=.",
  " ..:+*+-.       *%%*=::  --++++--  .:=*%%=       .-+*=...",
  "     .:=+**+=-.  .-****+=-.=  =.-=*#+*+:    :==+*+-:",
  "          .---**+*+=+*###%%%%%%%%##**=-++=**---.",
  "                 :. =-.==:=*--++:=+.-=.::",
  "",
  "                 E Y E B A L L",
  "           FRONTEND QUALITY ASSURANCE",
  "            Inspect what actually renders.",
];

const TITLE_INDEX = ART.length - 3;
const SUBTITLE_INDEX = ART.length - 2;

export const banner = () => ART.join("\n");

/** Writes the banner to stderr only in interactive terminals. */
export function showBanner(stream = process.stderr) {
  if (!stream.isTTY) return;
  const color = !process.env.NO_COLOR && stream.hasColors?.();
  const out = color
    ? ART.map((line, i) => {
        if (i === TITLE_INDEX) return `\x1b[1;37m${line}\x1b[0m`;
        if (i === SUBTITLE_INDEX) return `\x1b[1;36m${line}\x1b[0m`;
        return `\x1b[36m${line}\x1b[0m`;
      }).join("\n")
    : banner();
  stream.write(out + "\n\n");
}
