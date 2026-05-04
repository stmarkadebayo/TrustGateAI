import { describe, expect, it } from "vitest";
import { getPack } from "../src/lib/verify/packs";

describe("verify packs", () => {
  it("defines required vendor onboarding docs for nigeria", () => {
    const pack = getPack("nigeria");

    expect(pack.submissions.vendor_onboarding.requiredDocTypes).toContain("registration");
    expect(pack.submissions.vendor_onboarding.requiredDocTypes).toContain("tax_form");
  });

  it("defines required vendor onboarding docs for us", () => {
    const pack = getPack("us");

    expect(pack.submissions.vendor_onboarding.requiredDocTypes).toContain("registration");
    expect(pack.submissions.vendor_onboarding.requiredDocTypes).toContain("tax_form");
  });
});
