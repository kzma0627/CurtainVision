export const BASE_PRICE = 119; // CHF
export const CURRENCY = "CHF";

export function calculatePrice({ width, height, pleatMultiplier, quantity }) {
  const wNum = parseFloat(width || "0");
  const hNum = parseFloat(height || "0");
  const areaFactor = !wNum || !hNum ? 1 : Math.max((wNum / 100) * (hNum / 260), 1);
  const pleatFactor = pleatMultiplier / 2;
  const totalPrice = Math.round(BASE_PRICE * areaFactor * pleatFactor * Number(quantity || 1));
  return { basePrice: BASE_PRICE, areaFactor, pleatFactor, totalPrice, currency: CURRENCY };
}
