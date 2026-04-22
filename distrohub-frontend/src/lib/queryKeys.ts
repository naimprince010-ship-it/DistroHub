export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: () => [...queryKeys.products.all, 'list'] as const,
    meta: () => [...queryKeys.products.all, 'meta'] as const,
  },
};
