export const keys = {
  brandLogo: (workspaceId: string, brandId: string, ext: string) =>
    `workspaces/${workspaceId}/brands/${brandId}/logo.${ext}`,
  brandAsset: (workspaceId: string, brandId: string, assetId: string, ext: string) =>
    `workspaces/${workspaceId}/brands/${brandId}/assets/${assetId}.${ext}`,
  productAsset: (workspaceId: string, productId: string, assetId: string, ext: string) =>
    `workspaces/${workspaceId}/products/${productId}/assets/${assetId}.${ext}`,
  generationBackground: (workspaceId: string, generationId: string, variantId: string) =>
    `workspaces/${workspaceId}/generations/${generationId}/background-${variantId}.png`,
  generationVariant: (workspaceId: string, generationId: string, variantId: string) =>
    `workspaces/${workspaceId}/generations/${generationId}/variants/${variantId}.png`,
  inspirationUploadStaging: (workspaceId: string, uploadId: string, ext: string) =>
    `workspaces/${workspaceId}/uploads/inspiration/${uploadId}.${ext}`,
  inspirationClaimed: (workspaceId: string, generationId: string, ext: string) =>
    `workspaces/${workspaceId}/generations/${generationId}/inspiration.${ext}`,
  inspirationClaimedIdx: (workspaceId: string, generationId: string, idx: number, ext: string) =>
    `workspaces/${workspaceId}/generations/${generationId}/inspiration-${idx}.${ext}`,
  globalStock: (assetId: string, ext: string) => `stock/${assetId}.${ext}`,
  globalTemplatePreview: (templateId: string) => `templates/${templateId}/preview.png`,
  globalMoodPreview: (moodId: string) => `moods/${moodId}/preview.png`,
  landingHero: (cardId: string, ext: string) => `landing-hero/${cardId}.${ext}`,
  homeShowcaseImage: (imageId: string, ext: string) => `home-showcase/${imageId}.${ext}`,
};

export function workspacePrefix(workspaceId: string): string {
  return `workspaces/${workspaceId}/`;
}
