export function parseArgs(argv) {
  const positional = [];
  const options = { from: 1, to: 15 };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--from" || value === "--to") {
      const raw = argv[++i];
      if (!raw || !/^\d+$/.test(raw)) {
        throw new Error(`${value} must be followed by a positive integer`);
      }
      options[value.slice(2)] = Number(raw);
    } else if (value === "--help" || value === "-h") {
      options.help = true;
    } else if (value.startsWith("--")) {
      throw new Error(`Unknown option: ${value}`);
    } else {
      positional.push(value);
    }
  }

  const query = positional.join(" ").trim();
  if (!options.help && !query) throw new Error("A search query is required");
  if (options.from < 1 || options.to < 1) throw new Error("Result positions start at 1");
  if (options.from > options.to) throw new Error("--from cannot be greater than --to");
  if (options.to - options.from + 1 > 50) throw new Error("A single run is limited to 50 products");

  return { query, ...options };
}

export const helpText = `Usage:
  npm run scrape -- "search terms" [--from N] [--to N]

Examples:
  npm run scrape -- "Samsung Galaxy Tab S10+ 512GB"
  npm run scrape -- "Samsung Galaxy Tab S10+ 512GB" --to 5
  npm run scrape -- "Samsung Galaxy Tab S10+ 512GB" --from 10 --to 15`;
