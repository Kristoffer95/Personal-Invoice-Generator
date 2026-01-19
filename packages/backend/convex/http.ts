import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    const body = await request.text();
    let payload: {
      type: string;
      data: {
        id: string;
        email_addresses?: { id: string; email_address: string }[];
        primary_email_address_id?: string;
        first_name?: string;
        last_name?: string;
        username?: string;
        image_url?: string;
        created_at?: number;
        updated_at?: number;
        last_sign_in_at?: number;
      };
    };

    try {
      payload = new Webhook(webhookSecret).verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof payload;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    const { type, data } = payload;

    if (type === "user.created" || type === "user.updated") {
      const email =
        data.email_addresses?.find(
          (e) => e.id === data.primary_email_address_id
        )?.email_address ?? "";

      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: data.id,
        email,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        username: data.username ?? undefined,
        imageUrl: data.image_url ?? undefined,
        clerkCreatedAt: data.created_at ?? Date.now(),
        clerkUpdatedAt: data.updated_at ?? Date.now(),
        lastSignInAt: data.last_sign_in_at ?? undefined,
      });
    } else if (type === "user.deleted" && data.id) {
      await ctx.runMutation(internal.users.softDelete, { clerkId: data.id });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
