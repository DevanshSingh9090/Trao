import * as cheerio from "cheerio";

export interface CleanedHtml {
  title: string;
  text: string;
}

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "nav",
  "footer",
  "header",
  "aside",
  "form",
  "iframe",
  "canvas",
  "template",
];

export function cleanHtml(
  html: string
): CleanedHtml {
  const $ = cheerio.load(html);

  $(REMOVE_SELECTORS.join(",")).remove();

  const title =
    $("title")
      .first()
      .text()
      .trim();

  const main =
    $("main").first().text().trim() ||
    $("article").first().text().trim() ||
    $("body").text().trim();

  const text = normalizeText(main);

  return {
    title,
    text,
  };
}

function normalizeText(
  value: string
): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}