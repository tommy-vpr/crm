import { Worker } from "bullmq";
import { prisma } from "@cultivated-crm/db";
import { connection } from "../queues";

export const emailWorker = new Worker(
  "email",
  async (job) => {
    switch (job.name) {
      case "send-email": {
        const { to, subject, body, contactId, userId } = job.data;

        // Send via Resend
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html: body,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Resend API error: ${error}`);
        }

        // Log activity
        if (contactId) {
          await prisma.activity.create({
            data: {
              type: "EMAIL_SENT",
              title: `Email sent: ${subject}`,
              metadata: { to, subject },
              contactId,
              userId: userId ?? "system",
            },
          });

          // Update last contacted
          await prisma.contact.update({
            where: { id: contactId },
            data: { lastContactedAt: new Date() },
          });
        }

        console.log(`📧 Email sent to ${to}: ${subject}`);
        break;
      }

      case "send-sequence-step": {
        // TODO: Phase 4 — email sequence automation
        console.log("📨 Sequence step:", job.data);
        break;
      }

      case "sync-inbox": {
        // TODO: Phase 4 — Gmail sync
        console.log("🔄 Inbox sync:", job.data);
        break;
      }
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // Max 10 emails per second (Resend rate limit)
    },
  }
);
