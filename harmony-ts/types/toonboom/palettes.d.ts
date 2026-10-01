/**
 * Opaque or defined interface representing a Toon Boom Harmony PaletteList object.
 */
declare interface PaletteList {
  // Add PaletteList properties/methods here as needed
  [key: string]: unknown;
}

/**
 * Interface defining the API methods for PaletteObjectManager.
 */
declare interface PaletteObjectManagerAPI {
  /**
   * Loads the scene palette list and returns the corresponding PaletteList object.
   * If the palette list isn't already loaded, the method will load the palette list from the disk.
   *
   * @returns The scene palette list of the scene.
   */
  getScenePaletteList(): PaletteList;

  /**
   * Removes a palette from the scene and all elements, and schedules the file for deletion on next save.
   * The method needs to acquire the locks for the palette and each palette list, and throws a JavaScript exception if it can't get ownership.
   * Deleting the palette on disk may affect any drawing which links to the palette, even in other projects.
   *
   * @param id The ID of the palette to remove.
   * @returns Returns true if the palette is successfully removed.
   */
  removePaletteReferencesAndDeleteOnDisk(id: string): boolean;
}

/**
 * Global PaletteObjectManager object in Toon Boom Harmony scripting.
 */
declare const PaletteObjectManager: PaletteObjectManagerAPI;
