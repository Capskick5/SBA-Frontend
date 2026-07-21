import { listActiveBanners } from './adminConfigService';

export const bannerService = {
  list() {
    return listActiveBanners();
  },
};
