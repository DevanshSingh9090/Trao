import { assertSafeUrl } from "./url-security.js";
import { waitForHost, withBackoff } from "./rate-limiter.js";

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

const robotsCache = new Map<
  string,
  RobotsRules
>();

function parseRobots(
  content: string
): RobotsRules {
  const lines = content.split(/\r?\n/);

  let appliesToOurBot = false;
  let currentGroupMatches = false;

  const disallow: string[] = [];
  const allow: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine
      .split("#")[0]
      .trim();

    if (!line) {
      continue;
    }

    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const field = line
      .slice(0, separator)
      .trim()
      .toLowerCase();

    const value = line
      .slice(separator + 1)
      .trim();

    if (field === "user-agent") {
      currentGroupMatches =
        value === "*" ||
        value.toLowerCase() ===
          (
            process.env.USER_AGENT ||
            "interview-kit-bot/1.0"
          ).toLowerCase();

      appliesToOurBot = currentGroupMatches;
      continue;
    }

    if (!appliesToOurBot || !currentGroupMatches) {
      continue;
    }

    if (field === "disallow" && value) {
      disallow.push(value);
    }

    if (field === "allow" && value) {
      allow.push(value);
    }
  }

  return {
    disallow,
    allow,
  };
}

async function getRules(
  origin: string
): Promise<RobotsRules> {
  const cached = robotsCache.get(origin);

  if (cached) {
    return cached;
  }

  const robotsUrl = `${origin}/robots.txt`;

  try {
    const url = await assertSafeUrl(robotsUrl);

    await waitForHost(url.hostname);

    const response = await withBackoff(
      () =>
        fetch(url, {
          headers: {
            "User-Agent":
              process.env.USER_AGENT ||
              "interview-kit-bot/1.0",
          },
        })
    );

    if (!response.ok) {
      const emptyRules = {
        disallow: [],
        allow: [],
      };

      robotsCache.set(origin, emptyRules);

      return emptyRules;
    }

    const text = await response.text();

    const rules = parseRobots(text);

    robotsCache.set(origin, rules);

    return rules;
  } catch {
    // If robots.txt cannot be retrieved,
    // fail closed for safety.
    const rules = {
      disallow: ["/"],
      allow: [],
    };

    robotsCache.set(origin, rules);

    return rules;
  }
}

function pathMatches(
  path: string,
  rule: string
): boolean {
  if (!rule) {
    return false;
  }

  if (rule.endsWith("$")) {
    return path === rule.slice(0, -1);
  }

  return path.startsWith(rule);
}

export async function isAllowedByRobots(
  rawUrl: string
): Promise<boolean> {
  const url = await assertSafeUrl(rawUrl);

  const rules = await getRules(url.origin);

  const path = url.pathname || "/";

  const matchingAllows =
    rules.allow.filter((rule) =>
      pathMatches(path, rule)
    );

  if (matchingAllows.length > 0) {
    return true;
  }

  return !rules.disallow.some((rule) =>
    pathMatches(path, rule)
  );
}