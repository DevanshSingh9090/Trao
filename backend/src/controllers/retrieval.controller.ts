import type {
  Request,
  Response,
} from "express";

import {
  researchCompany,
} from "../retrieval/index.js";

export async function researchCompanyController(
  req: Request,
  res: Response
): Promise<void> {
  const { companyUrl } =
    req.body;

  if (
    typeof companyUrl !== "string" ||
    !companyUrl.trim()
  ) {
    res.status(400).json({
      success: false,
      message:
        "companyUrl is required",
    });

    return;
  }

  try {
    const research =
      await researchCompany(
        companyUrl.trim()
      );

    res.json({
      success: true,
      data: research,
    });
  } catch (error) {
    console.error(
      "Company research failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Company research failed",
    });
  }
}