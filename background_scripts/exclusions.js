// This module manages manages the exclusion rule setting. An exclusion is an object with two
// attributes: pattern and passKeys. The exclusion rules are an array of such objects.

// Convert a pattern (with * as glob wildcard) to a matcher object.
// Regex syntax (e.g. ? for optional char) is preserved within non-wildcard segments.
// Uses segment-based matching to prevent ReDoS from multiple .* sequences.
export function patternToRegExp(pattern) {
  // Collapse consecutive wildcards into one.
  const collapsed = pattern.replace(/\*{2,}/g, "*");
  const parts = collapsed.split("*");

  // No wildcards: standard regex match (no .* means no wildcard-driven ReDoS).
  if (parts.length === 1) {
    return new RegExp("^" + pattern + "$");
  }

  // Build individual regexes for each segment between wildcards.
  // First segment is anchored to start, last to end, middle segments float.
  // If any segment contains invalid regex, the entire pattern is invalid.
  let hasError = false;
  const segments = parts.map((part, i) => {
    if (!part) return null;
    try {
      if (i === 0) return new RegExp("^" + part);
      if (i === parts.length - 1) return new RegExp(part + "$");
      return new RegExp(part);
    } catch {
      hasError = true;
      return null;
    }
  });

  // If any segment had invalid regex, match nothing (same as original behavior).
  if (hasError) return /^$/;

  // Return a matcher that implements Symbol.search for String.prototype.search() compat.
  return {
    [Symbol.search](url) {
      let pos = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg) continue;
        const remaining = url.slice(pos);
        const m = remaining.match(seg);
        if (!m) return -1;
        pos += m.index + m[0].length;
      }
      return 0;
    },
  };
}

const ExclusionRegexpCache = {
  cache: {},
  clear(cache) {
    this.cache = cache || {};
  },
  get(pattern) {
    if (pattern in this.cache) {
      return this.cache[pattern];
    } else {
      let result;
      // We use try/catch to ensure that a broken regexp doesn't wholly cripple Vimium.
      try {
        result = patternToRegExp(pattern);
      } catch {
        if (!globalThis.isUnitTests) {
          console.log(`bad regexp in exclusion rule: ${pattern}`);
        }
        result = /^$/; // Match the empty string.
      }
      this.cache[pattern] = result;
      return result;
    }
  },
};

// Make RegexpCache, which is required on the page popup, accessible via the Exclusions object.
const RegexpCache = ExclusionRegexpCache;

// Merge the matching rules for URL, or null. In the normal case, we use the configured @rules;
// hence, this is the default. However, when called from the page popup, we are testing what
// effect candidate new rules would have on the current tab. In this case, the candidate rules are
// provided by the caller.
function getRule(url, rules) {
  if (rules == null) {
    rules = Settings.get("exclusionRules");
  }
  const matchingRules = rules.filter((r) =>
    r.pattern && (url.search(ExclusionRegexpCache.get(r.pattern)) >= 0)
  );
  // An absolute exclusion rule (one with no passKeys) takes priority.
  for (const rule of matchingRules) {
    if (!rule.passKeys) return rule;
  }
  // Strip whitespace from all matching passKeys strings, and join them together.
  const passKeys = matchingRules.map((r) => r.passKeys.split(/\s+/).join("")).join("");
  // TODO(philc): Remove this commented out code.
  // passKeys = (rule.passKeys.split(/\s+/).join "" for rule in matchingRules).join ""
  if (matchingRules.length > 0) {
    return { passKeys: Utils.distinctCharacters(passKeys) };
  } else {
    return null;
  }
}

export function isEnabledForUrl(url) {
  const rule = getRule(url);
  return {
    isEnabledForUrl: !rule || (rule.passKeys.length > 0),
    passKeys: rule ? rule.passKeys : "",
  };
}

function setRules(rules) {
  // Callers map a rule to null to have it deleted, and rules without a pattern are useless.
  const newRules = rules.filter((rule) => rule?.pattern);
  Settings.set("exclusionRules", newRules);
}

function onSettingsUpdated() {
  // NOTE(mrmr1993): In FF, the |rules| argument will be garbage collected when the exclusions
  // popup is closed. Do NOT store it/use it asynchronously.
  ExclusionRegexpCache.clear();
}

Settings.addEventListener("change", () => onSettingsUpdated());
