function publicAssetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export const PUBLIC_ASSETS = {
  logo: publicAssetPath('/ui/Roundtable%20Rumble%20Logo.PNG'),
  characterBack: publicAssetPath('/cards/backs/RR%20Character%20Card%20Back.PNG'),
  powerBack: publicAssetPath('/cards/backs/RR%20Power%20Card%20Back.PNG'),
  brendanFullFace: publicAssetPath('/cards/characters/brendan.JPG'),
  genericCharacterFace: publicAssetPath('/ui/Roundtable%20Rumble%20Logo.PNG'),
  genericPowerFace: publicAssetPath('/ui/Roundtable%20Rumble%20Logo.PNG'),
} as const;