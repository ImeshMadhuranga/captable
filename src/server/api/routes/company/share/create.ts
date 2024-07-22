import { withCompanyAuth } from "@/server/api/auth";
import { ApiError, ErrorResponses } from "@/server/api/error";
import type { PublicAPI } from "@/server/api/hono";
import { CreateShareSchema, ShareSchemaType } from "@/server/api/schema/shares";
import { getHonoUserAgent, getIp } from "@/server/api/utils";
import { addShare } from "@/server/services/shares/add-share";
import { createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";

const ParamsSchema = z.object({
  id: z
    .string()
    .cuid()
    .openapi({
      description: "Company ID",
      param: {
        name: "id",
        in: "path",
      },

      example: "clycjihpy0002c5fzcyf4gjjc",
    }),
});

const ResponseSchema = z.object({
  message: z.string(),
  data: CreateShareSchema,
});

const route = createRoute({
  method: "post",
  path: "/v1/companies/{id}/shares",
  summary: "Issue shares",
  description: "Issue shares to a stakeholder in a company.",
  tags: ["Shares"],
  request: {
    params: ParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: CreateShareSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Issue shares",
    },
    ...ErrorResponses,
  },
});

const create = (app: PublicAPI) => {
  app.openapi(route, async (c: Context) => {
    const { company, member, user } = await withCompanyAuth(c);
    const body = await c.req.json();

    const response = await addShare({
      ...body,
      companyId: company.id,
      memberId: member.id,
      requestIP: getIp(c.req),
      userAgent: getHonoUserAgent(c.req),
      user: {
        id: user.id,
        name: user.name,
      },
    });

    const data = response?.data;
    const success = response?.success;
    const message: string = response?.message.toString();

    if (!success || !data) {
      throw new ApiError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong, please try again or contact support.",
      });
    }

    // Ensure data matches ResponseSchema
    const responseData: ShareSchemaType = {
      status: data.status, // Cast to string if necessary
      certificateId: data.certificateId,
      quantity: data.quantity,
      pricePerShare: data.pricePerShare ?? 0,
      capitalContribution: data.capitalContribution ?? 0,
      ipContribution: data.ipContribution ?? 0,
      debtCancelled: data.debtCancelled ?? 0,
      otherContributions: data.otherContributions ?? 0,
      cliffYears: data.cliffYears ?? 0,
      vestingYears: data.vestingYears ?? 0,
      companyLegends: data.companyLegends ?? "", // Add missing fields
      issueDate: data.issueDate ? data.issueDate.toISOString() : new Date().toISOString(), // Add missing fields
      rule144Date: data.rule144Date ? data.rule144Date.toISOString() : new Date().toISOString(), // Convert rule144Date to string
      vestingStartDate: data.vestingStartDate ? data.vestingStartDate.toISOString() : new Date().toISOString(), // Add missing fields
      boardApprovalDate: data.boardApprovalDate ? data.boardApprovalDate.toISOString() : new Date().toISOString(), // Add boardApprovalDate
      stakeholderId: data.stakeholderId ?? "", // Add stakeholderId
      shareClassId: data.shareClassId,
    };

    return c.json({ message, data: responseData }, 200);
  });
};

export default create;
