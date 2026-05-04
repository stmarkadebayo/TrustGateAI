import type { ExtractedField, RegistryResult, VerifyCountry, VerifyDocType } from "@/lib/verify/types";
import type { ValidatorProfile } from "@/lib/verify/profiles";

export interface RegistryLookupAdapter {
  lookup(input: {
    country: VerifyCountry;
    docType: Exclude<VerifyDocType, "auto">;
    profiles: ValidatorProfile[];
    identifiers: string[];
    fields: ExtractedField[];
  }): Promise<RegistryResult>;
}

class EnvRegistryLookupAdapter {
  async lookup(input: {
    docType: Exclude<VerifyDocType, "auto">;
    identifiers: string[];
  }): Promise<RegistryResult> {
    const raw = process.env.VERIFY_REGISTRY_DATA;

    if (!raw) {
      return {
        configured: false,
        status: "unavailable",
        detail: "Registry validation is not configured in this deployment.",
      } satisfies RegistryResult;
    }

    try {
      const parsed = JSON.parse(raw) as Record<
        string,
        { status: "match" | "no_match" | "inconclusive"; detail: string; source?: string }
      >;

      for (const identifier of input.identifiers) {
        const exact = parsed[identifier];

        if (exact) {
          return {
            configured: true,
            status: exact.status,
            detail: exact.detail,
            source: exact.source ?? `Configured registry dataset (${input.docType})`,
          };
        }
      }

      return {
        configured: true,
        status: "inconclusive",
        detail: "No configured registry record matched the extracted identifiers.",
      };
    } catch {
      return {
        configured: true,
        status: "unavailable",
        detail: "Registry configuration is invalid JSON and could not be used.",
      };
    }
  }
}

class SamRegistryLookupAdapter {
  async lookup(input: {
    fields: ExtractedField[];
    profiles: ValidatorProfile[];
  }): Promise<RegistryResult | null> {
    if (!input.profiles.includes("sam_reference")) {
      return null;
    }

    const apiKey = process.env.SAM_API_KEY;
    if (!apiKey) {
      return null;
    }

    const baseUrl =
      process.env.SAM_API_BASE_URL ??
      "https://api.sam.gov/entity-information/v4/entities";
    const organization = input.fields.find((field) => field.key === "organization")?.value;
    const registrationId =
      input.fields.find((field) => field.key === "registrationId")?.value ??
      input.fields.find((field) => field.key === "taxId")?.value;

    if (!organization && !registrationId) {
      return {
        configured: true,
        status: "inconclusive",
        detail:
          "SAM API is configured, but no strong organization or registration identifier was extracted for lookup.",
        source: "SAM.gov Entity Management API",
      };
    }

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("includeSections", "entityRegistration,coreData");
      url.searchParams.set("pageSize", "5");
      if (registrationId) {
        url.searchParams.set("ueiSAM", registrationId);
      } else if (organization) {
        url.searchParams.set("legalBusinessName", organization);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`SAM returned ${response.status}`);
      }

      const json = (await response.json()) as {
        totalRecords?: number;
        entityData?: Array<{ coreData?: { entityInformation?: { legalBusinessName?: string } } }>;
      };

      if ((json.totalRecords ?? 0) > 0 || (json.entityData?.length ?? 0) > 0) {
        return {
          configured: true,
          status: "match",
          detail: "A public SAM.gov entity record matched the extracted business identity.",
          source: "SAM.gov Entity Management API",
        };
      }

      return {
        configured: true,
        status: "inconclusive",
        detail: "SAM API is configured, but no public entity record matched the extracted lookup values.",
        source: "SAM.gov Entity Management API",
      };
    } catch {
      return {
        configured: true,
        status: "unavailable",
        detail: "SAM API lookup could not be completed in this deployment.",
        source: "SAM.gov Entity Management API",
      };
    }
  }
}

class CacAssistedLookupAdapter {
  async lookup(input: {
    country: VerifyCountry;
    profiles: ValidatorProfile[];
    fields: ExtractedField[];
  }): Promise<RegistryResult | null> {
    if (input.country !== "nigeria" || !input.profiles.includes("registration_cac")) {
      return null;
    }

    const baseUrl =
      process.env.CAC_PUBLIC_SEARCH_URL ?? "https://icrp.cac.gov.ng/public-search";
    const registrationId =
      input.fields.find((field) => field.key === "registrationId")?.value ??
      input.fields.find((field) => field.key === "organization")?.value;

    return {
      configured: true,
      status: "inconclusive",
      detail: registrationId
        ? `CAC-assisted verification is available. Corroborate the extracted identity against the official CAC public search: ${baseUrl}`
        : `CAC-assisted verification is available via the official CAC public search: ${baseUrl}`,
      source: "CAC Public Search",
    };
  }
}

class CompositeRegistryLookupAdapter implements RegistryLookupAdapter {
  private readonly envAdapter = new EnvRegistryLookupAdapter();
  private readonly samAdapter = new SamRegistryLookupAdapter();
  private readonly cacAdapter = new CacAssistedLookupAdapter();

  async lookup(input: {
    country: VerifyCountry;
    docType: Exclude<VerifyDocType, "auto">;
    profiles: ValidatorProfile[];
    identifiers: string[];
    fields: ExtractedField[];
  }): Promise<RegistryResult> {
    const envResult = await this.envAdapter.lookup({
      docType: input.docType,
      identifiers: input.identifiers,
    });

    if (envResult.configured && envResult.status === "match") {
      return envResult;
    }

    const samResult = await this.samAdapter.lookup({
      fields: input.fields,
      profiles: input.profiles,
    });
    if (samResult) {
      return samResult;
    }

    const cacResult = await this.cacAdapter.lookup({
      country: input.country,
      profiles: input.profiles,
      fields: input.fields,
    });
    if (cacResult) {
      return cacResult;
    }

    return envResult;
  }
}

export const registryLookupAdapter: RegistryLookupAdapter =
  new CompositeRegistryLookupAdapter();
