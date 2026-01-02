export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; issues?: Record<string, string> };

export const ok = <T>(data?: T): ActionResult<T> => ({
  success: true,
  data,
});

export const fail = (
  error: string,
  issues?: Record<string, string>
): ActionResult<never> => ({
  success: false,
  error,
  issues,
});
