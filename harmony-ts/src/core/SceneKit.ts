export namespace SceneKit {
  export function getMetadatas(node: string): Record<string, any> {
    return scene.metadatas();
  }
}
