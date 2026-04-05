export const createEntityId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createToastId = (scopeId: string) => `${scopeId}-${Date.now()}`;
