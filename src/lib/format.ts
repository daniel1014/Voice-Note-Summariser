export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString();

export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString();

export const modelDisplayName = (model: string) =>
  model.split('/')[1]?.split(':')[0] ?? model;