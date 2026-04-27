function normalizeText(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-US") : "unknown date";
}

function formatItemLabel(item) {
  return `${item.name} (${item.category || "General"})`;
}

function formatItemDetail(item) {
  return [
    `- ${item.name}`,
    `  Category: ${item.category || "General"}`,
    `  Description: ${item.description || "No description provided."}`,
    `  Created: ${formatDate(item.createdAt)}`,
  ].join("\n");
}

function quoteTerms(terms) {
  if (terms.length === 0) {
    return "";
  }

  if (terms.length === 1) {
    return `"${terms[0]}"`;
  }

  if (terms.length === 2) {
    return `"${terms[0]}" or "${terms[1]}"`;
  }

  return `${terms
    .slice(0, -1)
    .map((term) => `"${term}"`)
    .join(", ")}, or "${terms[terms.length - 1]}"`;
}

function buildCategoryBreakdown(items) {
  const counts = items.reduce((summary, item) => {
    const category = item.category || "General";
    summary[category] = (summary[category] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts)
    .sort(([leftCategory], [rightCategory]) =>
      leftCategory.localeCompare(rightCategory)
    )
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
}

function findMentionedCategory(message, items) {
  const normalizedMessage = normalizeText(message);
  const categories = [...new Set(items.map((item) => item.category || "General"))]
    .sort((leftCategory, rightCategory) => rightCategory.length - leftCategory.length);

  return categories.find((category) =>
    normalizedMessage.includes(normalizeText(category))
  );
}

function extractSearchTerms(message) {
  const patterns = [
    /\bmentions?\b([\s\S]+)/i,
    /\bcontains?\b([\s\S]+)/i,
    /\bmatching\b([\s\S]+)/i,
    /\bsearch(?: for)?\b([\s\S]+)/i,
    /\bfind(?: me)?(?: items?)?(?: that)?\b([\s\S]+)/i,
  ];

  const match = patterns
    .map((pattern) => message.match(pattern))
    .find((result) => result && result[1]);

  if (!match) {
    return [];
  }

  return match[1]
    .replace(/^[\s:.-]+/, "")
    .replace(/[?!.\s]+$/, "")
    .split(/\s*,\s*|\s+\bor\b\s+|\s+\band\b\s+/i)
    .map((term) =>
      term
        .trim()
        .replace(/^(?:or|and)\s+/i, "")
        .replace(/^the\s+/i, "")
        .replace(/\bitems?\b/gi, "")
        .trim()
    )
    .filter((term) => term.length >= 2);
}

function buildListResponse(items) {
  if (items.length === 0) {
    return "There are no active items in the store right now.";
  }

  return [
    `You currently have ${items.length} active ${
      items.length === 1 ? "item" : "items"
    }:`,
    items.map((item) => `- ${formatItemLabel(item)}`).join("\n"),
  ].join("\n");
}

function buildItemCountResponse(items) {
  return `You currently have ${items.length} active ${
    items.length === 1 ? "item" : "items"
  }.`;
}

function buildCategoryCountResponse(items) {
  const categories = [...new Set(items.map((item) => item.category || "General"))];

  if (categories.length === 0) {
    return "There are no categories yet because there are no active items.";
  }

  return [
    `There ${categories.length === 1 ? "is" : "are"} ${categories.length} ${
      categories.length === 1 ? "category" : "categories"
    } represented right now.`,
    `Breakdown: ${buildCategoryBreakdown(items)}.`,
  ].join("\n");
}

function buildOldestResponse(items) {
  if (items.length === 0) {
    return "There are no active items yet, so there is no oldest item.";
  }

  const oldestItem = items[0];

  return [
    "The oldest active item is:",
    formatItemDetail(oldestItem),
  ].join("\n");
}

function buildNewestResponse(items) {
  if (items.length === 0) {
    return "There are no active items yet, so there is no newest item.";
  }

  const newestItem = items[items.length - 1];

  return [
    "The newest active item is:",
    formatItemDetail(newestItem),
  ].join("\n");
}

function buildSummaryResponse(items) {
  if (items.length === 0) {
    return "There are no active items yet, so there is nothing to summarize.";
  }

  const oldestItem = items[0];
  const newestItem = items[items.length - 1];

  return [
    `There are ${items.length} active items across ${
      [...new Set(items.map((item) => item.category || "General"))].length
    } categories.`,
    `Category breakdown: ${buildCategoryBreakdown(items)}.`,
    `Oldest item: ${formatItemLabel(oldestItem)}.`,
    `Newest item: ${formatItemLabel(newestItem)}.`,
  ].join("\n");
}

function buildCategoryItemsResponse(items, category) {
  const matchedItems = items.filter(
    (item) => normalizeText(item.category || "General") === normalizeText(category)
  );

  if (matchedItems.length === 0) {
    return `There are no active items in the ${category} category right now.`;
  }

  return [
    `I found ${matchedItems.length} ${
      matchedItems.length === 1 ? "item" : "items"
    } in the ${category} category:`,
    matchedItems.map((item) => `- ${formatItemLabel(item)}`).join("\n"),
  ].join("\n");
}

function buildSearchResponse(items, terms) {
  const matchedItems = items.filter((item) => {
    const haystack = normalizeText(
      [item.name, item.category || "General", item.description || ""].join(" ")
    );

    return terms.some((term) => haystack.includes(normalizeText(term)));
  });

  if (matchedItems.length === 0) {
    return `I could not find any active items mentioning ${quoteTerms(terms)}.`;
  }

  return [
    `I found ${matchedItems.length} ${
      matchedItems.length === 1 ? "item" : "items"
    } mentioning ${quoteTerms(terms)}:`,
    matchedItems.map((item) => `- ${formatItemLabel(item)}`).join("\n"),
  ].join("\n");
}

function buildDirectAnswer({ message, items }) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  if (
    /(?:what items do i have(?: right now| currently)?|what items do i currently have|what do i have(?: right now| currently)?|list(?: all)? (?:the )?(?:items|records)|show(?: me)? (?:all )?(?:items|records)|what items are (?:currently )?(?:stored|available))/i.test(
      normalizedMessage
    )
  ) {
    return buildListResponse(items);
  }

  if (/\b(how many|count)\b.*\bcategories?\b/i.test(normalizedMessage)) {
    return buildCategoryCountResponse(items);
  }

  if (/\b(how many|count)\b.*\b(items?|records?)\b/i.test(normalizedMessage)) {
    return buildItemCountResponse(items);
  }

  if (/\b(oldest|earliest)\b|\bfirst item\b/i.test(normalizedMessage)) {
    return buildOldestResponse(items);
  }

  if (/\b(newest|latest|most recent)\b/i.test(normalizedMessage)) {
    return buildNewestResponse(items);
  }

  if (/\b(summary|summarize|summarise|overview)\b/i.test(normalizedMessage)) {
    return buildSummaryResponse(items);
  }

  if (/\b(mention|mentions|contain|contains|matching|match|search|find)\b/i.test(message)) {
    const searchTerms = extractSearchTerms(message);

    if (searchTerms.length > 0) {
      return buildSearchResponse(items, searchTerms);
    }
  }

  const matchedCategory = findMentionedCategory(message, items);

  if (
    matchedCategory &&
    /\b(item|items|record|records|show|list|which|what|find)\b/i.test(
      normalizedMessage
    )
  ) {
    return buildCategoryItemsResponse(items, matchedCategory);
  }

  return null;
}

module.exports = {
  buildDirectAnswer,
};
