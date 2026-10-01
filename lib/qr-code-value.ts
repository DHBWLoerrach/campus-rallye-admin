export interface QrCodeSolutionOption {
  text?: string | null;
}

// Preserve individual-code behavior for existing questions with multiple options.
export function getQrCodeValue(
  solutionOptions: readonly QrCodeSolutionOption[] | null | undefined
): string {
  return solutionOptions?.[0]?.text?.trim() ?? '';
}
