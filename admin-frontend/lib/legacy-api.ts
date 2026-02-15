export const LEGACY_API_URL = (process.env.NEXT_PUBLIC_LEGACY_API_URL || "http://localhost:5000/api").replace(
  /\/+$/,
  ""
);
