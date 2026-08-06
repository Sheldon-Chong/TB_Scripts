namespace MetadataKit {
  /**
   * A metadata object as returned by scene.metadatas().
   *
   * IMPORTANT: Regardless of the declared `type`, the `value` is ALWAYS a
   * string when read back. Harmony's metadata system stores everything as
   * strings — `type` is purely a semantic label. Use `parseValue()` to
   * convert the string back to its intended JavaScript type.
   */
  export interface MetadataObject {
    name: string;
    type: 'string' | 'int' | 'double' | 'bool';
    creator: string;
    version: string;
    /** Always a string when read back from the scene. */
    value: string;
  }

  // ── Internal helpers ──────────────────────────────────────────────

  /** Infer the Harmony metadata type string from a JavaScript value. */
  function inferType(value: string | number | boolean): 'string' | 'int' | 'double' | 'bool' {
    switch (typeof value) {
      case 'string':
        return 'string';
      case 'boolean':
        return 'bool';
      case 'number':
        return value % 1 === 0 ? 'int' : 'double';
      default:
        return 'string';
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  /** Return the list of all metadata objects for the current scene. */
  export function getAll(): MetadataObject[] {
    return scene.metadatas();
  }

  /** Return all unique metadata key names in the current scene. */
  export function keys(): string[] {
    const all = scene.metadatas();
    const result: string[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name && result.indexOf(all[i].name) === -1) {
        result.push(all[i].name);
      }
    }
    return result;
  }

  /** Check whether a metadata entry with the given name exists. */
  export function has(key: string): boolean {
    const all = scene.metadatas();
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name === key) return true;
    }
    return false;
  }

  /**
   * Get a single metadata object by name. Optionally filter by type.
   * Returns undefined if no match is found.
   *
   * NOTE: When `type` is omitted, we search the full metadatas() array
   * because Harmony's scene.metadata(name) defaults to type="string"
   * and won't find entries with type "int", "double", or "bool".
   */
  export function get(
    name: string,
    type?: 'string' | 'int' | 'double' | 'bool',
  ): MetadataObject | undefined {
    // If a specific type is requested, use the native API which is faster
    if (type !== undefined) {
      const m = scene.metadata(name, type);
      if (!m || m.name === undefined) return undefined;
      return m;
    }
    // No type specified: search all metadata to avoid the "string" default
    const all = scene.metadatas();
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name === name) {
        return all[i];
      }
    }
    return undefined;
  }

  /**
   * Set (insert or update) a metadata value on the current scene.
   *
   * The Harmony metadata `type` is automatically inferred from the
   * JavaScript type of `value`:
   *   string  → "string"
   *   number  → "int" (whole) or "double" (fractional)
   *   boolean → "bool"
   */
  export function set(key: string, value: string | number | boolean): void {
    scene.setMetadata({
      name: key,
      type: inferType(value),
      value: value,
    });
  }

  export function removeAll(): void {
    const all = scene.metadatas();
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name) {
        scene.removeMetadata({ name: all[i].name, type: all[i].type });
      }
    }
  }

  /**
   * Remove all metadata entries with the given name from the scene.
   * @returns true if at least one entry was found and removed.
   */
  export function remove(key: string): boolean {
    // Collect matching entries from the full list (avoid scene.metadata()
    // which defaults to type="string" and misses non-string types).
    const all = scene.metadatas();
    const matches: MetadataObject[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name === key) {
        matches.push(all[i]);
      }
    }

    if (matches.length === 0) return false;

    let removed = false;
    for (let i = 0; i < matches.length; i++) {
      if (scene.removeMetadata({ name: key, type: matches[i].type })) {
        removed = true;
      }
    }
    return removed;
  }

  /**
   * Parse a metadata value string back to its declared JavaScript type.
   *
   * - "string" → string (identity)
   * - "int"    → number (via parseInt)
   * - "double" → number (via parseFloat)
   * - "bool"   → boolean ("true" → true, anything else → false)
   */
  export function parseValue(meta: MetadataObject): string | number | boolean {
    switch (meta.type) {
      case 'string':
        return meta.value;
      case 'int':
        return parseInt(meta.value, 10);
      case 'double':
        return parseFloat(meta.value);
      case 'bool':
        return meta.value === 'true';
      default:
        return meta.value;
    }
  }

  /**
   * Convenience: get a single metadata by name and return its parsed value,
   * or a default if not found.
   */
  export function getValue(
    name: string,
    defaultValue?: string | number | boolean,
  ): string | number | boolean | undefined {
    const meta = get(name);
    if (!meta) return defaultValue;
    return parseValue(meta);
  }
}
