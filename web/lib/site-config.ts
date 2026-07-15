/**
 * Site Configuration
 * Update this before going live
 */

// Domain - change this when you deploy
const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://modelbase.fun';

// Ensure no trailing slash
export const SITE_URL = DOMAIN.replace(/\/$/, '');

// Site metadata
export const SITE_NAME = 'ModelBase';
export const SITE_TAGLINE = 'Free 3D Models Library';

export default {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
};
