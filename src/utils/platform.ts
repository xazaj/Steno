import { platform } from '@tauri-apps/plugin-os';

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

let cachedPlatform: Platform | null = null;

export const getPlatform = async (): Promise<Platform> => {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  try {
    const platformName = await platform();
    
    switch (platformName) {
      case 'macos':
        cachedPlatform = 'macos';
        break;
      case 'windows':
        cachedPlatform = 'windows';
        break;
      case 'linux':
        cachedPlatform = 'linux';
        break;
      default:
        cachedPlatform = 'unknown';
    }
    
    return cachedPlatform;
  } catch (error) {
    console.error('获取平台信息失败:', error);
    cachedPlatform = 'unknown';
    return cachedPlatform;
  }
};

export const isMacOS = async (): Promise<boolean> => {
  const platformName = await getPlatform();
  return platformName === 'macos';
};

export const isWindows = async (): Promise<boolean> => {
  const platformName = await getPlatform();
  return platformName === 'windows';
};

export const isLinux = async (): Promise<boolean> => {
  const platformName = await getPlatform();
  return platformName === 'linux';
};