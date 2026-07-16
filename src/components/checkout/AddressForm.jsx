import { useEffect, useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { vietnamAddressService } from '../../services/vietnamAddressService';

const defaultValues = {
  recipient: '',
  phone: '',
  line: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

export default function AddressForm({
  initialValues = defaultValues,
  onSubmit,
  submitLabel = 'Save',
  loading = false,
  onCancel,
  fieldErrors = {},
  showDefaultOption = true,
}) {
  const [values, setValues] = useState({ ...defaultValues, ...initialValues });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [addressLookupError, setAddressLookupError] = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const initialCity = initialValues.city;
  const initialDistrict = initialValues.district;

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoadingProvinces(true);
      return vietnamAddressService.listProvinces();
    })
      .then((items) => {
        if (!active) return;
        setProvinces(items);
        const matchedProvince = items.find((province) => province.name === initialCity);
        if (matchedProvince) setProvinceCode(String(matchedProvince.code));
      })
      .catch(() => {
        if (active) setAddressLookupError('Address lookup is unavailable. You can enter the address manually.');
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });

    return () => {
      active = false;
    };
  }, [initialCity]);

  useEffect(() => {
    if (!provinceCode) {
      Promise.resolve().then(() => {
        setDistricts([]);
        setDistrictCode('');
      });
      return;
    }

    let active = true;
    Promise.resolve().then(() => {
      setLoadingDistricts(true);
      return vietnamAddressService.listDistricts(provinceCode);
    })
      .then((items) => {
        if (!active) return;
        setDistricts(items);
        const matchedDistrict = items.find((district) => district.name === initialDistrict);
        setDistrictCode(matchedDistrict ? String(matchedDistrict.code) : '');
      })
      .catch(() => {
        if (active) setAddressLookupError('District lookup is unavailable. You can enter the district manually.');
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [provinceCode, initialDistrict]);

  useEffect(() => {
    if (!districtCode) {
      Promise.resolve().then(() => setWards([]));
      return;
    }

    let active = true;
    Promise.resolve().then(() => {
      setLoadingWards(true);
      return vietnamAddressService.listWards(districtCode);
    })
      .then((items) => {
        if (active) setWards(items);
      })
      .catch(() => {
        if (active) setAddressLookupError('Ward lookup is unavailable. You can enter the ward manually.');
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });

    return () => {
      active = false;
    };
  }, [districtCode]);

  const handleProvinceChange = (event) => {
    const code = event.target.value;
    if (code === 'current') return;

    const province = provinces.find((item) => String(item.code) === code);
    setProvinceCode(code);
    setDistrictCode('');
    setValues((prev) => ({
      ...prev,
      city: province?.name || '',
      district: '',
      ward: '',
    }));
  };

  const handleDistrictChange = (event) => {
    const code = event.target.value;
    if (code === 'current') return;

    const district = districts.find((item) => String(item.code) === code);
    setDistrictCode(code);
    setValues((prev) => ({
      ...prev,
      district: district?.name || '',
      ward: '',
    }));
  };

  const handleWardChange = (event) => {
    setField('ward', event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(values);
  };

  const hasProvinceOptions = provinces.length > 0;
  const hasDistrictOptions = districts.length > 0;
  const hasWardOptions = wards.length > 0;
  const shouldShowManualCity = !loadingProvinces && !hasProvinceOptions;
  const shouldShowManualDistrict = !provinceCode || (!loadingDistricts && !hasDistrictOptions);
  const shouldShowManualWard = !districtCode || (!loadingWards && !hasWardOptions);
  const currentCityExists = values.city && !provinces.some((province) => province.name === values.city);
  const currentDistrictExists = values.district && !districts.some((district) => district.name === values.district);
  const currentWardExists = values.ward && !wards.some((ward) => ward.name === values.ward);
  const citySelectValue = provinceCode || (currentCityExists ? 'current' : '');
  const districtSelectValue = districtCode || (currentDistrictExists ? 'current' : '');

  return (
    <form className="form address-form" onSubmit={handleSubmit}>
      <div className="address-form-note">
        <strong>Delivery contact</strong>
        <span>Use the name and phone number that the shipper should contact.</span>
      </div>

      <div className="address-form-grid">
        <Input
          label="Recipient name"
          name="recipient"
          placeholder="Full name of the recipient"
          value={values.recipient}
          onChange={(e) => setField('recipient', e.target.value)}
          error={fieldErrors.recipient}
          required
        />
        <Input
          label="Phone"
          name="phone"
          placeholder="Vietnam phone number"
          value={values.phone}
          onChange={(e) => setField('phone', e.target.value)}
          error={fieldErrors.phone}
          required
        />
        <div className="field-span-2">
          <Input
            label="Street address"
            name="line"
            placeholder="House number, street, building, apartment"
            value={values.line}
            onChange={(e) => setField('line', e.target.value)}
            error={fieldErrors.line}
            required
          />
        </div>
        {shouldShowManualCity ? (
          <Input
            label="City / Province"
            name="city"
            placeholder="City or province"
            value={values.city}
            onChange={(e) => setField('city', e.target.value)}
            error={fieldErrors.city}
            required
          />
        ) : (
          <label className={`field${fieldErrors.city ? ' field-invalid' : ''}`}>
            <span>City / Province</span>
            <select
              name="city"
              value={citySelectValue}
              onChange={handleProvinceChange}
              disabled={loadingProvinces}
              aria-invalid={fieldErrors.city ? 'true' : undefined}
              required
            >
              <option value="">{loadingProvinces ? 'Loading provinces...' : 'Select city or province'}</option>
              {currentCityExists && <option value="current">{values.city}</option>}
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
          </label>
        )}
        {shouldShowManualDistrict ? (
          <Input
            label="District"
            name="district"
            placeholder={provinceCode ? 'District' : 'Select city or province first'}
            value={values.district}
            onChange={(e) => setField('district', e.target.value)}
            disabled={!provinceCode && hasProvinceOptions}
          />
        ) : (
          <label className="field">
            <span>District</span>
            <select
              name="district"
              value={districtSelectValue}
              onChange={handleDistrictChange}
              disabled={loadingDistricts}
            >
              <option value="">{loadingDistricts ? 'Loading districts...' : 'Select district'}</option>
              {currentDistrictExists && <option value="current">{values.district}</option>}
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {shouldShowManualWard ? (
          <Input
            label="Ward"
            name="ward"
            placeholder={districtCode ? 'Ward' : 'Select district first'}
            value={values.ward}
            onChange={(e) => setField('ward', e.target.value)}
            disabled={!districtCode && hasProvinceOptions}
          />
        ) : (
          <label className="field">
            <span>Ward</span>
            <select
              name="ward"
              value={values.ward}
              onChange={handleWardChange}
              disabled={loadingWards}
            >
              <option value="">{loadingWards ? 'Loading wards...' : 'Select ward'}</option>
              {currentWardExists && <option value={values.ward}>{values.ward}</option>}
              {wards.map((ward) => (
                <option key={ward.code} value={ward.name}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {addressLookupError && <p className="form-hint">{addressLookupError}</p>}

      {showDefaultOption && (
        <label className="check address-default-check">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => setField('isDefault', e.target.checked)}
          />
          <span>
            <strong>Save as default address</strong>
            <small>Use this address faster next time.</small>
          </span>
        </label>
      )}

      <div className="actions address-form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" className="btn-secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
