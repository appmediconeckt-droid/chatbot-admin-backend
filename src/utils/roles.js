export const PROFESSIONAL_ROLES = ["doctor", "consultant", "counselor", "counsellor", "counsellour"];
export const SIGNUP_ROLES = ["user", ...PROFESSIONAL_ROLES];

export const isProfessionalRole = (role) =>
  PROFESSIONAL_ROLES.includes(String(role || "").trim().toLowerCase());

// Existing professional routes grant shared capabilities without changing
// the account role stored in MongoDB, tokens, or API responses.
export const hasAllowedRole = (role, allowedRoles) =>
  allowedRoles.includes(role) ||
  (isProfessionalRole(role) && allowedRoles.some((allowed) =>
    ["counsellor", "counselor"].includes(allowed),
  ));
