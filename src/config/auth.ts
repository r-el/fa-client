const requireEmailVerification = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION;

export const REQUIRE_EMAIL_VERIFICATION = requireEmailVerification !== "false";