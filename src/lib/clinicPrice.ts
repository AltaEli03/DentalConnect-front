const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export function clinicFromPrice(
  services: ReadonlyArray<{ priceFrom?: number | null }>,
): number | undefined {
  const prices = services
    .map((service) => service.priceFrom)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price >= 0);

  return prices.length > 0 ? Math.min(...prices) : undefined;
}

export function formatPriceFrom(amount: number): string {
  return priceFormatter.format(amount);
}
