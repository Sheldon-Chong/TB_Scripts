/**
 * A metadata object as returned by sceneApi.metadatas().
 *
 * IMPORTANT: Regardless of the declared `type`, the `value` is ALWAYS a
 * string when read back. Harmony's metadata system stores everything as
 * strings — `type` is purely a semantic label. Use `parseValue()` to
 * convert the string back to its intended JavaScript type.
 */
interface SceneMetadataObject {
  name: string;
  type: 'string' | 'int' | 'double' | 'bool';
  creator: string;
  version: string;
  /** Always a string when read back from the scene. */
  value: string;
}

function createMetadataKit(sceneApi: typeof scene) {
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
  function getAll(): SceneMetadataObject[] {
    return sceneApi.metadatas();
  }

  /** Return all unique metadata key names in the current scene. */
  function keys(): string[] {
    const all = sceneApi.metadatas();
    const result: string[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name && result.indexOf(all[i].name) === -1) {
        result.push(all[i].name);
      }
    }
    return result;
  }

  /** Check whether a metadata entry with the given name exists. */
  function has(key: string): boolean {
    const all = sceneApi.metadatas();
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
   * because Harmony's sceneApi.metadata(name) defaults to type="string"
   * and won't find entries with type "int", "double", or "bool".
   */
  function get(
    name: string,
    type?: 'string' | 'int' | 'double' | 'bool',
  ): SceneMetadataObject | undefined {
    // If a specific type is requested, use the native API which is faster
    if (type !== undefined) {
      const m = sceneApi.metadata(name, type);
      if (!m || m.name === undefined) return undefined;
      return m;
    }
    // No type specified: search all metadata to avoid the "string" default
    const all = sceneApi.metadatas();
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
  function set(key: string, value: string | number | boolean): void {
    sceneApi.setMetadata({
      name: key,
      type: inferType(value),
      value: value,
    });
  }

  /**
   * Store an arbitrary JavaScript object as a JSON string.
   *
   * Harmony metadata only stores strings, so the object is serialized with
   * JSON.stringify() and saved with type "string". Use getJson() to read
   * it back.
   */
  function setJson(key: string, value: unknown): void {
    set(key, JSON.stringify(value));
  }

  function removeAll(): void {
    const all = sceneApi.metadatas();

    const skipNames = ['guideList', 'symmetryGuideList', 'alignmentGuideList'];

    for (let i = 0; i < all.length; i++) {
      if (all[i].name && skipNames.indexOf(all[i].name) !== -1) {
        continue;
      }
      if (all[i] && all[i].name) {
        sceneApi.removeMetadata({ name: all[i].name, type: all[i].type });
      }
    }
  }

  /**
   * Remove all metadata entries with the given name from the scene.
   * @returns true if at least one entry was found and removed.
   */
  function remove(key: string): boolean {
    // Collect matching entries from the full list (avoid sceneApi.metadata()
    // which defaults to type="string" and misses non-string types).
    const all = sceneApi.metadatas();
    const matches: SceneMetadataObject[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].name === key) {
        matches.push(all[i]);
      }
    }

    if (matches.length === 0) return false;

    let removed = false;
    for (let i = 0; i < matches.length; i++) {
      if (sceneApi.removeMetadata({ name: key, type: matches[i].type })) {
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
  function parseValue(meta: SceneMetadataObject): string | number | boolean {
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
  function getValue(
    name: string,
    defaultValue?: string | number | boolean,
  ): string | number | boolean | undefined {
    const meta = get(name);
    if (!meta) return defaultValue;
    return parseValue(meta);
  }

  /**
   * Read a metadata value that was stored with setJson() and parse it back
   * into an object. Returns undefined if the key doesn't exist or the stored
   * value isn't valid JSON.
   */
  function getJson<T = unknown>(key: string): T | undefined {
    const raw = getValue(key);
    if (typeof raw !== 'string') return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      return undefined;
    }
  }
  return {
    getAll, keys, has, get, set, setJson, removeAll, remove, parseValue, getValue, getJson,
  };
}
