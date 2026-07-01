const BASE_URL = 'https://provinces.open-api.vn/api/v1';

let provinceCache = null;
const districtCache = new Map();
const wardCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Vietnam address API request failed.');
  }
  return response.json();
}

export const vietnamAddressService = {
  async listProvinces() {
    if (provinceCache) return provinceCache;

    const provinces = await fetchJson(`${BASE_URL}/?depth=1`);
    provinceCache = (provinces || []).map((province) => ({
      code: province.code,
      name: province.name,
    }));
    return provinceCache;
  },

  async listDistricts(provinceCode) {
    if (!provinceCode) return [];
    if (districtCache.has(provinceCode)) return districtCache.get(provinceCode);

    const province = await fetchJson(`${BASE_URL}/p/${provinceCode}?depth=2`);
    const districts = (province.districts || []).map((district) => ({
      code: district.code,
      name: district.name,
    }));
    districtCache.set(provinceCode, districts);
    return districts;
  },

  async listWards(districtCode) {
    if (!districtCode) return [];
    if (wardCache.has(districtCode)) return wardCache.get(districtCode);

    const district = await fetchJson(`${BASE_URL}/d/${districtCode}?depth=2`);
    const wards = (district.wards || []).map((ward) => ({
      code: ward.code,
      name: ward.name,
    }));
    wardCache.set(districtCode, wards);
    return wards;
  },
};
