import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

// Dark theme matching the app's design system
// Background: hsl(234 25% 9%) = card color
// Foreground: hsl(220 15% 92%)
export const appDarkTheme = createTheme({
  theme: "dark",
  settings: {
    background: "hsl(234 25% 9%)",
    foreground: "hsl(220 15% 92%)",
    caret: "hsl(180 55% 55%)",
    selection: "hsl(180 55% 55% / 0.2)",
    selectionMatch: "hsl(180 55% 55% / 0.12)",
    lineHighlight: "hsl(220 20% 14%)",
    gutterBackground: "hsl(234 25% 9%)",
    gutterForeground: "hsl(230 10% 40%)",
    gutterBorder: "transparent",
  },
  styles: [
    { tag: t.comment, color: "hsl(230 10% 45%)", fontStyle: "italic" },
    { tag: t.lineComment, color: "hsl(230 10% 45%)", fontStyle: "italic" },
    { tag: t.blockComment, color: "hsl(230 10% 45%)", fontStyle: "italic" },
    { tag: t.docComment, color: "hsl(230 10% 45%)", fontStyle: "italic" },
    { tag: [t.string, t.special(t.string)], color: "hsl(30 90% 68%)" },
    { tag: t.number, color: "hsl(195 80% 68%)" },
    { tag: t.bool, color: "hsl(195 80% 68%)" },
    { tag: t.null, color: "hsl(230 10% 55%)" },
    { tag: [t.keyword, t.operator], color: "hsl(265 55% 72%)" },
    { tag: [t.definitionKeyword, t.modifier], color: "hsl(265 55% 72%)" },
    { tag: [t.className, t.definition(t.typeName), t.typeName], color: "hsl(180 55% 60%)" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "hsl(210 75% 70%)" },
    { tag: t.definition(t.variableName), color: "hsl(210 75% 70%)" },
    { tag: [t.propertyName, t.attributeName], color: "hsl(210 60% 72%)" },
    { tag: t.variableName, color: "hsl(220 15% 85%)" },
    { tag: [t.tagName, t.angleBracket], color: "hsl(0 65% 68%)" },
    { tag: t.attributeValue, color: "hsl(30 90% 68%)" },
    { tag: t.punctuation, color: "hsl(230 10% 58%)" },
    { tag: t.separator, color: "hsl(230 10% 58%)" },
    { tag: t.url, color: "hsl(180 55% 60%)" },
    { tag: t.escape, color: "hsl(30 90% 68%)" },
    { tag: t.regexp, color: "hsl(0 65% 68%)" },
    { tag: [t.meta, t.atom], color: "hsl(230 10% 55%)" },
  ],
});

// Light theme matching the app's design system
// Background: hsl(225 25% 97%) = card color light
export const appLightTheme = createTheme({
  theme: "light",
  settings: {
    background: "hsl(225 25% 97%)",
    foreground: "hsl(234 20% 12%)",
    caret: "hsl(180 65% 34%)",
    selection: "hsl(180 65% 34% / 0.15)",
    selectionMatch: "hsl(180 65% 34% / 0.08)",
    lineHighlight: "hsl(230 15% 93%)",
    gutterBackground: "hsl(225 25% 97%)",
    gutterForeground: "hsl(230 8% 55%)",
    gutterBorder: "transparent",
  },
  styles: [
    { tag: t.comment, color: "hsl(230 8% 52%)", fontStyle: "italic" },
    { tag: t.lineComment, color: "hsl(230 8% 52%)", fontStyle: "italic" },
    { tag: t.blockComment, color: "hsl(230 8% 52%)", fontStyle: "italic" },
    { tag: t.docComment, color: "hsl(230 8% 52%)", fontStyle: "italic" },
    { tag: [t.string, t.special(t.string)], color: "hsl(20 80% 38%)" },
    { tag: t.number, color: "hsl(195 75% 32%)" },
    { tag: t.bool, color: "hsl(195 75% 32%)" },
    { tag: t.null, color: "hsl(230 8% 50%)" },
    { tag: [t.keyword, t.operator], color: "hsl(265 55% 45%)" },
    { tag: [t.definitionKeyword, t.modifier], color: "hsl(265 55% 45%)" },
    { tag: [t.className, t.definition(t.typeName), t.typeName], color: "hsl(180 65% 30%)" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "hsl(210 75% 40%)" },
    { tag: t.definition(t.variableName), color: "hsl(210 75% 40%)" },
    { tag: [t.propertyName, t.attributeName], color: "hsl(210 60% 38%)" },
    { tag: t.variableName, color: "hsl(234 20% 18%)" },
    { tag: [t.tagName, t.angleBracket], color: "hsl(0 65% 44%)" },
    { tag: t.attributeValue, color: "hsl(20 80% 38%)" },
    { tag: t.punctuation, color: "hsl(230 8% 48%)" },
    { tag: t.separator, color: "hsl(230 8% 48%)" },
    { tag: t.url, color: "hsl(180 65% 30%)" },
    { tag: t.escape, color: "hsl(20 80% 38%)" },
    { tag: t.regexp, color: "hsl(0 65% 44%)" },
    { tag: [t.meta, t.atom], color: "hsl(230 8% 50%)" },
  ],
});
