// Types for the avatar collection system

export interface SystemAvatarConfig {
  name: string;
  description?: string;
  bgColor?: string;
  bgScene?: string;
  tags?: string[];
}

export interface SystemAvatar {
  id: string;           // folder name (slug)
  name: string;
  description: string;
  glbUrl: string;       // web path: /avatars/system/{id}/avatar.glb
  previewUrl: string;   // web path: /avatars/system/{id}/preview.png
  bgColor: string;
  bgScene: string;
  tags: string[];
}

export interface UserAvatar {
  id: string;
  userId: string;
  name: string;
  source: 'system' | 'url' | 'upload' | 'rpm';
  glbUrl: string | null;
  localGlbPath: string | null;
  previewUrl: string | null;
  bgColor: string;
  bgScene: string;
  isActive: boolean;
  createdAt: string;
}

/** Returns the effective GLB URL for loading in the viewer */
export function getAvatarViewerUrl(avatar: UserAvatar): string {
  if (avatar.localGlbPath) return avatar.localGlbPath;
  return avatar.glbUrl ?? '';
}
