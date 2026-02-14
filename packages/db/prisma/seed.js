"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding database...");
    // ─── USERS ──────────────────────────────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: "tommy@cultivatedagency.com" },
        update: {},
        create: {
            email: "tommy@cultivatedagency.com",
            name: "Tommy",
            role: "ADMIN",
        },
    });
    const manager = await prisma.user.upsert({
        where: { email: "manager@cultivatedagency.com" },
        update: {},
        create: {
            email: "manager@cultivatedagency.com",
            name: "Sarah Chen",
            role: "MANAGER",
        },
    });
    const member = await prisma.user.upsert({
        where: { email: "member@cultivatedagency.com" },
        update: {},
        create: {
            email: "member@cultivatedagency.com",
            name: "Alex Rivera",
            role: "MEMBER",
        },
    });
    // ─── TEAM ───────────────────────────────────────────────────
    const team = await prisma.team.create({
        data: {
            name: "Sales Team",
            members: {
                create: [
                    { userId: admin.id, role: "LEAD" },
                    { userId: manager.id, role: "MEMBER" },
                    { userId: member.id, role: "MEMBER" },
                ],
            },
        },
    });
    // ─── TAGS ───────────────────────────────────────────────────
    const tags = await Promise.all([
        prisma.tag.create({ data: { name: "Hot Lead", color: "#EF4444" } }),
        prisma.tag.create({ data: { name: "Enterprise", color: "#8B5CF6" } }),
        prisma.tag.create({ data: { name: "Referral", color: "#10B981" } }),
        prisma.tag.create({ data: { name: "Follow Up", color: "#F59E0B" } }),
    ]);
    // ─── COMPANIES ──────────────────────────────────────────────
    const companies = await Promise.all([
        prisma.company.create({
            data: {
                name: "TechStart Inc",
                domain: "techstart.io",
                industry: "SaaS",
                size: "SMALL",
                website: "https://techstart.io",
            },
        }),
        prisma.company.create({
            data: {
                name: "GrowthCo",
                domain: "growthco.com",
                industry: "E-commerce",
                size: "MEDIUM",
                website: "https://growthco.com",
            },
        }),
        prisma.company.create({
            data: {
                name: "Enterprise Solutions Ltd",
                domain: "enterprise-solutions.com",
                industry: "Consulting",
                size: "LARGE",
                website: "https://enterprise-solutions.com",
            },
        }),
    ]);
    // ─── CONTACTS ───────────────────────────────────────────────
    const contacts = await Promise.all([
        prisma.contact.create({
            data: {
                firstName: "James",
                lastName: "Wilson",
                email: "james@techstart.io",
                phone: "+1-555-0101",
                title: "CTO",
                source: "REFERRAL",
                ownerId: admin.id,
                companyId: companies[0].id,
            },
        }),
        prisma.contact.create({
            data: {
                firstName: "Maria",
                lastName: "Santos",
                email: "maria@growthco.com",
                phone: "+1-555-0102",
                title: "VP of Marketing",
                source: "LINKEDIN",
                ownerId: manager.id,
                companyId: companies[1].id,
            },
        }),
        prisma.contact.create({
            data: {
                firstName: "David",
                lastName: "Park",
                email: "dpark@enterprise-solutions.com",
                phone: "+1-555-0103",
                title: "Head of Digital",
                source: "INBOUND",
                ownerId: member.id,
                companyId: companies[2].id,
            },
        }),
    ]);
    // ─── PIPELINE & STAGES ─────────────────────────────────────
    const pipeline = await prisma.pipeline.create({
        data: {
            name: "Sales Pipeline",
            isDefault: true,
            stages: {
                create: [
                    { name: "Lead", position: 0, color: "#6B7280", probability: 10 },
                    { name: "Qualified", position: 1, color: "#3B82F6", probability: 25 },
                    { name: "Proposal", position: 2, color: "#8B5CF6", probability: 50 },
                    { name: "Negotiation", position: 3, color: "#F59E0B", probability: 75 },
                    { name: "Won", position: 4, color: "#10B981", probability: 100, isWon: true },
                    { name: "Lost", position: 5, color: "#EF4444", probability: 0, isLost: true },
                ],
            },
        },
        include: { stages: true },
    });
    const stages = pipeline.stages.sort((a, b) => a.position - b.position);
    // ─── DEALS ──────────────────────────────────────────────────
    const deals = await Promise.all([
        prisma.deal.create({
            data: {
                title: "TechStart Website Redesign",
                value: 15000,
                stageId: stages[2].id, // Proposal
                pipelineId: pipeline.id,
                ownerId: admin.id,
                companyId: companies[0].id,
                teamId: team.id,
                priority: "HIGH",
                expectedCloseDate: new Date("2026-03-15"),
                contacts: { create: [{ contactId: contacts[0].id, role: "Decision Maker" }] },
            },
        }),
        prisma.deal.create({
            data: {
                title: "GrowthCo E-commerce Platform",
                value: 45000,
                stageId: stages[1].id, // Qualified
                pipelineId: pipeline.id,
                ownerId: manager.id,
                companyId: companies[1].id,
                teamId: team.id,
                priority: "URGENT",
                expectedCloseDate: new Date("2026-04-01"),
                contacts: { create: [{ contactId: contacts[1].id, role: "Champion" }] },
            },
        }),
        prisma.deal.create({
            data: {
                title: "Enterprise Portal Development",
                value: 85000,
                stageId: stages[0].id, // Lead
                pipelineId: pipeline.id,
                ownerId: member.id,
                companyId: companies[2].id,
                teamId: team.id,
                priority: "MEDIUM",
                expectedCloseDate: new Date("2026-06-01"),
                contacts: { create: [{ contactId: contacts[2].id, role: "Influencer" }] },
            },
        }),
    ]);
    // ─── ACTIVITIES ─────────────────────────────────────────────
    await Promise.all([
        prisma.activity.create({
            data: {
                type: "NOTE",
                title: "Initial discovery call",
                description: "Discussed requirements for website redesign. They want a modern Next.js stack.",
                contactId: contacts[0].id,
                dealId: deals[0].id,
                userId: admin.id,
            },
        }),
        prisma.activity.create({
            data: {
                type: "EMAIL_SENT",
                title: "Sent proposal document",
                contactId: contacts[0].id,
                dealId: deals[0].id,
                userId: admin.id,
            },
        }),
        prisma.activity.create({
            data: {
                type: "MEETING",
                title: "Requirements workshop",
                description: "2-hour deep dive into e-commerce needs and integration requirements.",
                contactId: contacts[1].id,
                dealId: deals[1].id,
                userId: manager.id,
            },
        }),
    ]);
    // ─── TASKS ──────────────────────────────────────────────────
    await Promise.all([
        prisma.task.create({
            data: {
                title: "Follow up on TechStart proposal",
                description: "Check if James has reviewed the proposal and schedule next steps.",
                assigneeId: admin.id,
                creatorId: admin.id,
                dealId: deals[0].id,
                contactId: contacts[0].id,
                dueDate: new Date("2026-02-14"),
                priority: "HIGH",
            },
        }),
        prisma.task.create({
            data: {
                title: "Prepare GrowthCo scope document",
                assigneeId: manager.id,
                creatorId: admin.id,
                dealId: deals[1].id,
                dueDate: new Date("2026-02-17"),
                priority: "URGENT",
            },
        }),
        prisma.task.create({
            data: {
                title: "Research Enterprise Solutions competitors",
                assigneeId: member.id,
                creatorId: manager.id,
                dealId: deals[2].id,
                dueDate: new Date("2026-02-20"),
                priority: "MEDIUM",
            },
        }),
    ]);
    console.log("✅ Seed complete!");
    console.log(`   Users: 3`);
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Contacts: ${contacts.length}`);
    console.log(`   Pipeline stages: ${stages.length}`);
    console.log(`   Deals: ${deals.length}`);
}
main()
    .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map