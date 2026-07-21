import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ErrorState, LoadingState } from '../../components/ui/State';
import {
  getGiftWrapFeeAdmin,
  isGiftWrapFeeMockMode,
  setGiftWrapFeeAdmin,
} from '../../services/adminConfigService';
import { showToast } from '../../utils/toast';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminGiftWrapFeePage() {
  const [giftWrapFee, setGiftWrapFeeInput] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingMock, setUsingMock] = useState(false);
  const [savingGiftFee, setSavingGiftFee] = useState(false);

  useEffect(() => {
    let active = true;
    getGiftWrapFeeAdmin()
      .then((fee) => {
        if (!active) return;
        setGiftWrapFeeInput(String(fee));
        setUsingMock(isGiftWrapFeeMockMode());
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, 'Could not load the gift wrap fee.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveGiftWrapFee = async (event) => {
    event.preventDefault();
    const amount = Number(giftWrapFee);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast('Gift wrap fee must be a non-negative number.', 'error');
      return;
    }
    setSavingGiftFee(true);
    try {
      const saved = await setGiftWrapFeeAdmin(amount);
      setGiftWrapFeeInput(String(saved));
      setUsingMock(isGiftWrapFeeMockMode());
      showToast(isGiftWrapFeeMockMode() ? 'Gift wrap fee saved locally (API unavailable).' : 'Gift wrap fee saved.');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save the gift wrap fee.'), 'error');
    } finally {
      setSavingGiftFee(false);
    }
  };

  return (
    <section className="stack">
      <header className="admin-banners-header">
        <div>
          <h1>Gift wrap fee</h1>
          <p>Configure the gift wrap fee shown during checkout.</p>
        </div>
      </header>

      <section className="panel admin-settings-panel">
        <div className="admin-settings-panel-header">
          <div>
            <h2>Gift wrap fee</h2>
            <p>Applied to checkout totals whenever a customer chooses gift wrapping.</p>
          </div>
          {usingMock && (
            <span className="status-badge unknown">Offline mock fallback</span>
          )}
        </div>

        {loading ? (
          <LoadingState text="Loading gift wrap fee..." />
        ) : error ? (
          <ErrorState text={error} />
        ) : (
          <form className="admin-gift-fee-form" onSubmit={saveGiftWrapFee}>
            <Input
              label="Gift wrap fee (VND)"
              type="number"
              min="0"
              step="1000"
              value={giftWrapFee}
              onChange={(event) => setGiftWrapFeeInput(event.target.value)}
            />
            <Button type="submit" loading={savingGiftFee}>
              Save gift fee
            </Button>
          </form>
        )}
      </section>
    </section>
  );
}
