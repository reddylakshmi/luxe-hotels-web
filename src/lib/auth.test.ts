import { describe, it, expect } from "vitest";
import {
  isSessionExpired,
  sessionFromAuthPayload,
  validateConfirmPassword,
  validatePassword,
  validateSignInForm,
  validateSignUpForm,
  type Session,
} from "./auth";

const validPwd = "Hunter22a";

describe("validatePassword", () => {
  it("requires the field", () => {
    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword(undefined)).toBe("Password is required");
  });

  it("rejects passwords shorter than 8 chars", () => {
    expect(validatePassword("Hunt22")).toBe("Password must be at least 8 characters");
  });

  it("rejects passwords with no letter", () => {
    expect(validatePassword("12345678")).toBe("Password must include at least one letter");
  });

  it("rejects passwords with no digit", () => {
    expect(validatePassword("password")).toBe("Password must include at least one digit");
  });

  it("accepts a strong password", () => {
    expect(validatePassword(validPwd)).toBeUndefined();
  });

  it("accepts symbols/whitespace as long as letter+digit are present", () => {
    expect(validatePassword("a1!@#$%^&")).toBeUndefined();
  });
});

describe("validateConfirmPassword", () => {
  it("requires the confirm value", () => {
    expect(validateConfirmPassword(validPwd, "")).toBe("Confirm password is required");
  });

  it("rejects mismatches", () => {
    expect(validateConfirmPassword(validPwd, "different1")).toBe("Passwords do not match");
  });

  it("accepts matches", () => {
    expect(validateConfirmPassword(validPwd, validPwd)).toBeUndefined();
  });
});

describe("validateSignInForm", () => {
  it("collects email + password errors together", () => {
    const errors = validateSignInForm({ email: "bad", password: "" });
    expect(errors.email).toMatch(/valid email/);
    expect(errors.password).toBe("Password is required");
  });

  it("does NOT enforce password strength on sign-in", () => {
    // A pre-existing account might have a 6-char password — sign-in
    // shouldn't lock the guest out by retroactively requiring strength.
    const errors = validateSignInForm({ email: "g@example.com", password: "short" });
    expect(errors).toEqual({});
  });

  it("returns no errors for a clean input", () => {
    const errors = validateSignInForm({ email: "g@example.com", password: validPwd });
    expect(errors).toEqual({});
  });
});

describe("validateSignUpForm", () => {
  const valid = {
    firstName: "Aria", lastName: "Patel",
    email: "aria@example.com",
    password: validPwd, confirmPassword: validPwd,
    acceptTerms: true,
  };

  it("returns no errors for a clean input", () => {
    expect(validateSignUpForm(valid)).toEqual({});
  });

  it("requires first and last name", () => {
    const errors = validateSignUpForm({ ...valid, firstName: "", lastName: "" });
    expect(errors.firstName).toBe("First name is required");
    expect(errors.lastName).toBe("Last name is required");
  });

  it("enforces password strength on sign-up", () => {
    const errors = validateSignUpForm({ ...valid, password: "short", confirmPassword: "short" });
    expect(errors.password).toMatch(/8 characters/);
  });

  it("flags mismatched confirm-password", () => {
    const errors = validateSignUpForm({ ...valid, confirmPassword: "different1" });
    expect(errors.confirmPassword).toBe("Passwords do not match");
  });

  it("requires acceptTerms", () => {
    const errors = validateSignUpForm({ ...valid, acceptTerms: false });
    expect(errors.acceptTerms).toMatch(/booking terms/);
  });
});

describe("isSessionExpired", () => {
  const now = 1_000_000_000_000;
  const fresh: Session = {
    token: "t", expiresAt: now + 60_000,
    guest: { id: "g", email: "a@b.c", firstName: "A", lastName: "B" },
  };

  it("is true for null / missing session", () => {
    expect(isSessionExpired(null, now)).toBe(true);
    expect(isSessionExpired(undefined, now)).toBe(true);
  });

  it("is false for a session that hasn't reached expiry", () => {
    expect(isSessionExpired(fresh, now)).toBe(false);
  });

  it("is true at the exact expiry instant", () => {
    expect(isSessionExpired({ ...fresh, expiresAt: now }, now)).toBe(true);
  });

  it("is true after expiry", () => {
    expect(isSessionExpired({ ...fresh, expiresAt: now - 1 }, now)).toBe(true);
  });
});

describe("sessionFromAuthPayload", () => {
  it("flattens the GraphQL AuthPayload into the Session shape", () => {
    const payload = {
      accessToken: "tok-abc",
      expiresIn: 3600,
      guest: {
        id: "guest-1",
        email: "a@b.c",
        name: { firstName: "Aria", lastName: "Patel" },
      },
    };
    const s = sessionFromAuthPayload(payload, 1_000_000_000_000);
    expect(s.token).toBe("tok-abc");
    expect(s.expiresAt).toBe(1_000_000_000_000 + 3600 * 1000);
    expect(s.guest).toEqual({
      id: "guest-1", email: "a@b.c", firstName: "Aria", lastName: "Patel",
    });
  });
});
