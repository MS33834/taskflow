declare module '@nodert-win10-rs4/windows.security.credentials.ui' {
  export const UserConsentVerifier: {
    checkAvailabilityAsync: (
      callback: (err: Error | null, result: number) => void
    ) => void;
    requestVerificationAsync: (
      message: string,
      callback: (err: Error | null, result: number) => void
    ) => void;
  };
  export const UserConsentVerifierAvailability: {
    available: number;
    [key: string]: number;
  };
  export const UserConsentVerificationResult: {
    verified: number;
    [key: string]: number;
  };
}
