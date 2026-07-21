export function isCodPayment(paymentMethod) {
  return paymentMethod === 'COD';
}

export function isCodCheckoutSuccess(result) {
  if (!result?.orderId || result?.checkoutUrl) return false;
  return !isMockCodOrderResult(result);
}

export function isMockCodOrderResult(result) {
  if (result?.mock) return true;
  return String(result?.orderId || '').startsWith('cod-mock-');
}

export function shouldUseCodMock(paymentMethod, result, error) {
  if (!isCodPayment(paymentMethod)) return false;
  if (isCodCheckoutSuccess(result)) return false;
  if (result?.checkoutUrl) return true;
  if (error) return true;
  return false;
}

export function buildMockCodOrderResult(preview) {
  const total = typeof preview?.total === 'number'
    ? preview.total
    : Number(preview?.subtotal || 0);

  return {
    orderId: `cod-mock-${Date.now()}`,
    total,
    paymentMethod: 'COD',
    mock: true,
  };
}

export async function checkoutWithCodFallback({ paymentMethod, preview, checkoutCall }) {
  try {
    const result = await checkoutCall();
    if (shouldUseCodMock(paymentMethod, result, null)) {
      return { result: buildMockCodOrderResult(preview), usedMock: true };
    }
    return { result, usedMock: false };
  } catch (error) {
    if (shouldUseCodMock(paymentMethod, null, error)) {
      return { result: buildMockCodOrderResult(preview), usedMock: true };
    }
    throw error;
  }
}
