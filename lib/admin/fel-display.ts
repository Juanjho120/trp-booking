export function formatAdminFelDateOnlyForCard(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatAdminFelDateRangeForCard(
  checkInDate: string,
  checkOutDate: string,
): string {
  return `${formatAdminFelDateOnlyForCard(
    checkInDate,
  )} - ${formatAdminFelDateOnlyForCard(checkOutDate)}`;
}

export function formatAdminFelNightsForCard(
  nights: number,
  labels: Readonly<{ singular: string; plural: string }>,
): string {
  return `${nights} ${nights === 1 ? labels.singular : labels.plural}`;
}
