// Tiny zero-dependency ANSI helpers + prompts.
import readline from "node:readline";

const useColor =
  process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const wrap = (open, close) => (s) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : String(s);

export const c = {
  lime: wrap("38;5;191", "39"),
  teal: wrap("38;5;43", "39"),
  red: wrap("38;5;203", "39"),
  yellow: wrap("38;5;221", "39"),
  dim: wrap("2", "22"),
  bold: wrap("1", "22"),
  gray: wrap("38;5;245", "39"),
};

export const sym = {
  ok: c.teal("✔"),
  err: c.red("✖"),
  warn: c.yellow("▲"),
  info: c.lime("›"),
  arrow: c.lime("→"),
};

export const log = (...a) => console.log(...a);
export const ok = (m) => log(`  ${sym.ok} ${m}`);
export const err = (m) => log(`  ${sym.err} ${c.red(m)}`);
export const warn = (m) => log(`  ${sym.warn} ${c.yellow(m)}`);
export const info = (m) => log(`  ${sym.info} ${m}`);

export function banner() {
  const art = [
    "   ___                          ___ _    ___",
    "  / _ )___ _______ _____  ___  / __| |  |_ _|",
    " / _  / _ `/ __/ // / _ \\/ _ \\ (__| |__ | |",
    "/____/\\_,_/_/  \\_, /\\___/_//_/\\___|____|___|",
    "              /___/",
  ].join("\n");
  log(c.lime(c.bold(art)));
  log(c.dim("  AI coding & learning agent · baryon.ai\n"));
}

/** Hidden-input prompt (for API keys). Falls back to visible if no TTY. */
export function promptHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // non-interactive: read one line from stdin
      const rl = readline.createInterface({ input: process.stdin });
      rl.question(question, (a) => {
        rl.close();
        resolve(a.trim());
      });
      return;
    }
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let buf = "";
    const onData = (ch) => {
      const s = ch.toString("utf8");
      if (s === "\r" || s === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(buf.trim());
      } else if (s === "") {
        // Ctrl+C
        process.stdout.write("\n");
        process.exit(130);
      } else if (s === "" || s === "\b") {
        buf = buf.slice(0, -1);
      } else {
        buf += s;
      }
    };
    stdin.on("data", onData);
  });
}

export function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });
}
