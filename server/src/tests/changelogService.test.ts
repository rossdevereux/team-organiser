import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseChangelogMarkdown,
  getChangelogData,
  findChangelogPath,
} from '../services/changelogService.js';

describe('changelogService Suite', () => {
  it('parses standard Keep a Changelog markdown into structured releases and sections', () => {
    const sampleMarkdown = `
# Changelog

All notable changes will be documented in this file.

## [Unreleased]

### Added
- New goalkeeper lock toggle on pitch view ([#4](https://github.com/test/repo/issues/4)).
- Support for per-fixture unlock overrides.

### Fixed
- Fixed layout squishing in inspect drawer.

## [1.0.0] - 2026-10-12

### Added
- Initial launch with Hungarian matching and multi-formation support.

### Changed
- Standardized pitch coordinates.
`;

    const releases = parseChangelogMarkdown(sampleMarkdown);
    assert.equal(releases.length, 2);

    // Verify Unreleased release
    const unreleased = releases[0];
    assert.equal(unreleased.version, 'Unreleased');
    assert.equal(unreleased.isUnreleased, true);
    assert.equal(unreleased.sections.length, 2);

    const addedSection = unreleased.sections.find((s) => s.title === 'Added');
    assert.ok(addedSection);
    assert.equal(addedSection.items.length, 2);
    assert.match(addedSection.items[0], /New goalkeeper lock toggle/);
    assert.match(addedSection.items[1], /Support for per-fixture unlock/);

    const fixedSection = unreleased.sections.find((s) => s.title === 'Fixed');
    assert.ok(fixedSection);
    assert.equal(fixedSection.items.length, 1);
    assert.match(fixedSection.items[0], /Fixed layout squishing/);

    // Verify 1.0.0 release
    const v1 = releases[1];
    assert.equal(v1.version, '1.0.0');
    assert.equal(v1.date, '2026-10-12');
    assert.equal(v1.isUnreleased, false);
    assert.equal(v1.sections.length, 2);
    assert.equal(v1.sections[0].title, 'Added');
    assert.match(v1.sections[0].items[0], /Initial launch/);
  });

  it('handles multi-line items and nested indentation under bullet points', () => {
    const complexMarkdown = `
## [1.1.0] - 2026-10-15

### Added
- **Multi-Fixture Support**:
  - Pan-fixture matrix view
  - Export to WhatsApp and CSV
- Single line item
`;

    const releases = parseChangelogMarkdown(complexMarkdown);
    assert.equal(releases.length, 1);
    const added = releases[0].sections[0];
    assert.equal(added.items.length, 2);
    assert.match(added.items[0], /Multi-Fixture Support/);
    assert.match(added.items[0], /Pan-fixture matrix view/);
    assert.equal(added.items[1], 'Single line item');
  });

  it('returns empty array when given markdown with no version headers', () => {
    const emptyMarkdown = '# Only Header\nSome random notes without version headers.';
    const releases = parseChangelogMarkdown(emptyMarkdown);
    assert.deepEqual(releases, []);
  });

  it('locates CHANGELOG.md in the project workspace and returns full changelog data', () => {
    const changelogPath = findChangelogPath();
    assert.ok(changelogPath, 'CHANGELOG.md path should be found');

    const data = getChangelogData();
    assert.ok(data.currentVersion, 'Must return current version string');
    assert.ok(Array.isArray(data.releases), 'Releases must be an array');
    assert.ok(data.releases.length > 0, 'Should parse at least one release');
    assert.ok(data.rawMarkdown, 'Raw markdown should be included');
  });
});
