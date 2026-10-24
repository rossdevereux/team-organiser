import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const guidePath = path.join(rootDir, 'docs', 'USER_GUIDE.md');

console.log('🔍 Validating User Guide documentation...');

// 1. Check file existence & non-emptiness
if (!fs.existsSync(guidePath)) {
  console.error(`❌ Error: ${guidePath} does not exist!`);
  process.exit(1);
}

const content = fs.readFileSync(guidePath, 'utf-8');
if (!content.trim() || content.length < 500) {
  console.error(`❌ Error: docs/USER_GUIDE.md is empty or too short (length: ${content.length})`);
  process.exit(1);
}

console.log(`✅ File exists and contains ${content.length} characters.`);

// Helper function to generate slug identical to standard GitHub markdown
function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove characters that aren't letters, digits, spaces, or hyphens
    .replace(/ /g, '-');
}

// 2. Parse all headings
const headingRegex = /^#{1,6}\s+(.+)$/gm;
const headings: { level: number; text: string; slug: string }[] = [];
let match: RegExpExecArray | null;

while ((match = headingRegex.exec(content)) !== null) {
  const rawHeading = match[1].trim();
  headings.push({
    level: match[0].indexOf(' '),
    text: rawHeading,
    slug: githubSlug(rawHeading),
  });
}

const slugSet = new Set(headings.map((h) => h.slug));
console.log(`✅ Parsed ${headings.length} headings in document.`);

// 3. Extract all markdown anchor links in Table of Contents [title](#anchor)
const linkRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
const links: { title: string; anchor: string }[] = [];

while ((match = linkRegex.exec(content)) !== null) {
  links.push({
    title: match[1],
    anchor: match[2],
  });
}

console.log(`✅ Found ${links.length} internal anchor links.`);

const missingAnchors: { title: string; anchor: string }[] = [];
for (const link of links) {
  if (!slugSet.has(link.anchor)) {
    missingAnchors.push(link);
  }
}

if (missingAnchors.length > 0) {
  console.error(`❌ Error: Found ${missingAnchors.length} broken internal anchor links:`);
  for (const m of missingAnchors) {
    console.error(`   - Link "${m.title}" points to "#${m.anchor}", but no matching heading slug exists.`);
  }
  process.exit(1);
}

console.log('✅ All internal table-of-contents anchor links resolve properly.');

// 4. Verify core feature keywords
const requiredKeywords = [
  'Rotation',
  'Fair Play',
  'Live Match',
  'WhatsApp',
  'Admin',
  'Early Departure',
  'Subscription',
];

const missingKeywords: string[] = [];
for (const kw of requiredKeywords) {
  const regex = new RegExp(kw, 'i');
  // Check if keyword appears in headings or content
  const inHeading = headings.some((h) => regex.test(h.text));
  const inBody = regex.test(content);
  if (!inHeading && !inBody) {
    missingKeywords.push(kw);
  }
}

if (missingKeywords.length > 0) {
  console.error(`❌ Error: Missing required feature sections/keywords: ${missingKeywords.join(', ')}`);
  process.exit(1);
}

console.log(`✅ Verified presence of all ${requiredKeywords.length} core feature keywords: ${requiredKeywords.join(', ')}.`);
console.log('🎉 Documentation verification passed successfully!');
process.exit(0);
