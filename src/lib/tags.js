/** Nhãn hiển thị cho tag khẩu vị của món. */
export const TAG_LABELS = {
  cay: { label: 'Cay', icon: '🌶️' },
  chay: { label: 'Chay', icon: '🥦' },
  'it-calo': { label: 'Ít calo', icon: '🪶' },
  'giau-dam': { label: 'Giàu đạm', icon: '💪' },
  'no-lau': { label: 'No lâu', icon: '🍱' },
  'nhe-bung': { label: 'Nhẹ bụng', icon: '🍃' },
  ngot: { label: 'Ngọt', icon: '🍬' },
  'mat-lanh': { label: 'Mát lạnh', icon: '🧊' },
}

export function tagLabel(tag) {
  return TAG_LABELS[tag] ?? { label: tag, icon: '🏷️' }
}
