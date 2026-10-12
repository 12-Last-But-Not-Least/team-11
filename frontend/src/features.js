// Feature flags, off by default. VITE_FEATURE_TRANSFORM=true enables the
// step 4 "try removing the trend" card once the backend supports it.
export const FEATURES = {
  transform: import.meta.env.VITE_FEATURE_TRANSFORM === "true",
};
