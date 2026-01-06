/**
 * Version comparison and diff utilities
 */

export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

export interface DetailedDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
}

/**
 * Compare two JSON objects and return a simple diff
 */
export function compareVersions(oldSpec: any, newSpec: any): VersionDiff {
  const diff: VersionDiff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldSpec || {}),
    ...Object.keys(newSpec || {}),
  ]);

  for (const key of allKeys) {
    const hasOld = key in (oldSpec || {});
    const hasNew = key in (newSpec || {});

    if (!hasOld && hasNew) {
      diff.added.push(key);
    } else if (hasOld && !hasNew) {
      diff.removed.push(key);
    } else if (hasOld && hasNew) {
      // Deep comparison for modified
      if (JSON.stringify(oldSpec[key]) !== JSON.stringify(newSpec[key])) {
        diff.modified.push(key);
      } else {
        diff.unchanged.push(key);
      }
    }
  }

  return diff;
}

/**
 * Generate a detailed diff with paths and values
 */
export function generateDetailedDiff(
  oldSpec: any,
  newSpec: any,
  path: string = ''
): DetailedDiff[] {
  const diffs: DetailedDiff[] = [];

  // Handle primitive types
  if (typeof oldSpec !== 'object' || typeof newSpec !== 'object') {
    if (oldSpec !== newSpec) {
      diffs.push({
        path,
        type: 'modified',
        oldValue: oldSpec,
        newValue: newSpec,
      });
    }
    return diffs;
  }

  // Handle null values
  if (oldSpec === null && newSpec !== null) {
    diffs.push({
      path,
      type: 'added',
      newValue: newSpec,
    });
    return diffs;
  }

  if (oldSpec !== null && newSpec === null) {
    diffs.push({
      path,
      type: 'removed',
      oldValue: oldSpec,
    });
    return diffs;
  }

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldSpec || {}),
    ...Object.keys(newSpec || {}),
  ]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const hasOld = key in (oldSpec || {});
    const hasNew = key in (newSpec || {});

    if (!hasOld && hasNew) {
      diffs.push({
        path: currentPath,
        type: 'added',
        newValue: newSpec[key],
      });
    } else if (hasOld && !hasNew) {
      diffs.push({
        path: currentPath,
        type: 'removed',
        oldValue: oldSpec[key],
      });
    } else if (hasOld && hasNew) {
      const oldValue = oldSpec[key];
      const newValue = newSpec[key];

      // Recurse into objects
      if (
        typeof oldValue === 'object' &&
        oldValue !== null &&
        typeof newValue === 'object' &&
        newValue !== null &&
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue)
      ) {
        diffs.push(...generateDetailedDiff(oldValue, newValue, currentPath));
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diffs.push({
          path: currentPath,
          type: 'modified',
          oldValue,
          newValue,
        });
      }
    }
  }

  return diffs;
}

/**
 * Generate a human-readable summary of changes
 */
export function generateChangeSummary(diff: VersionDiff): string {
  const parts: string[] = [];

  if (diff.added.length > 0) {
    parts.push(`Added: ${diff.added.join(', ')}`);
  }

  if (diff.removed.length > 0) {
    parts.push(`Removed: ${diff.removed.join(', ')}`);
  }

  if (diff.modified.length > 0) {
    parts.push(`Modified: ${diff.modified.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'No changes detected';
  }

  return parts.join('; ');
}

/**
 * Count total changes in a diff
 */
export function countChanges(diff: VersionDiff): number {
  return diff.added.length + diff.removed.length + diff.modified.length;
}
