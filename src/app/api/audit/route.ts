import { NextResponse } from "next/server";
import { analyzeAuditPack } from "@/lib/audit/service";
import type { AuditFileRole, AuditMapping, AuditMode } from "@/lib/audit/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const mode = (formData.get("mode") as AuditMode | null) ?? "general";
    const files = formData.getAll("files");
    const roles = formData.getAll("roles");
    const rawMappings = formData.getAll("mappings");

    const packFiles = await Promise.all(
      files.map(async (entry, index) => {
        if (!(entry instanceof File)) {
          throw new Error("One or more uploaded audit files were invalid.");
        }

        const buffer = Buffer.from(await entry.arrayBuffer());
        const role = (roles[index] as AuditFileRole | undefined) ?? "invoices";
        const rawMapping = rawMappings[index];

        return {
          buffer,
          fileName: entry.name,
          fileType: entry.type || "application/octet-stream",
          role,
          overrideMapping:
            typeof rawMapping === "string" && rawMapping
              ? (JSON.parse(rawMapping) as AuditMapping)
              : undefined,
        };
      })
    );

    if (!packFiles.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const result = await analyzeAuditPack({
      files: packFiles,
      mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Audit analysis failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
