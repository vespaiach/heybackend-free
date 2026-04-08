export const logger = {
  error(context: string, error: unknown) {
    console.error(`[ERROR] ${context}:`, error);
  },
};
