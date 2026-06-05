import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_TEMPLATES } from "../src/lib/permissions";
import { PRODUCTION_STAGES, type ProductionStage } from "../src/lib/orders";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

const STONE_IMAGES = {
  granite:
    "https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&h=300&fit=crop",
  marble:
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
};

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.marblepro.local" },
    update: {},
    create: {
      email: "owner@demo.marblepro.local",
      passwordHash,
      fullName: "Rahul Sharma",
      emailVerified: true,
      preferredLang: "hi",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "sharma-stone-works" },
    update: {},
    create: {
      name: "Sharma Stone Works",
      slug: "sharma-stone-works",
      plan: "professional",
      status: "active",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      gstin: "08AAAAA0000A1Z5",
      businessAddress: "Industrial Area, Kishangarh, Rajasthan",
      state: "Rajasthan",
      phone: "+919876543210",
      invoicePrefix: "MP",
    },
  });

  const roleIds: Record<string, string> = {};
  for (const [name, template] of Object.entries(ROLE_TEMPLATES)) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: { tenantId: tenant.id, name },
      },
      update: {
        permissions: template.permissions,
        isSystemRole: template.isSystemRole,
      },
      create: {
        tenantId: tenant.id,
        name,
        permissions: template.permissions,
        isSystemRole: template.isSystemRole,
      },
    });
    roleIds[name] = role.id;
  }

  await prisma.tenantMember.upsert({
    where: {
      userId_tenantId: { userId: owner.id, tenantId: tenant.id },
    },
    update: { status: "active", roleId: roleIds.owner },
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      roleId: roleIds.owner,
      status: "active",
      joinedAt: new Date(),
    },
  });

  const existingSlabs = await prisma.slab.count({ where: { tenantId: tenant.id } });
  if (existingSlabs >= 8) {
    console.log("Seed skipped (data exists). Login: owner@demo.marblepro.local / demo1234");
    return;
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      name: "Rajasthan Stone Traders",
      phone: "+919988776655",
      gstin: "08BBBBB0000B1Z5",
    },
  });

  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Black Galaxy Granite",
      category: "granite",
      origin: "Karnataka",
      color: "Black with gold flecks",
      finish: "polished",
      sizeL: 3000,
      sizeW: 1800,
      sizeH: 20,
      thicknessMm: 20,
      weightKg: 285,
      rateSqft: 185,
      minStockAlert: 5,
      imageUrl: STONE_IMAGES.granite,
    },
  });

  await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Italian Carrara Marble",
      category: "marble",
      origin: "Italy",
      color: "White with grey veins",
      finish: "polished",
      sizeL: 2800,
      sizeW: 1600,
      sizeH: 18,
      thicknessMm: 18,
      rateSqft: 320,
      minStockAlert: 3,
      imageUrl: STONE_IMAGES.marble,
    },
  });

  const batch = await prisma.batch.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      supplierId: supplier.id,
      purchasePrice: 420000,
      quantity: 8,
      receivedDate: new Date(),
      vehicleNumber: "RJ14 AB 4521",
      totalWeightKg: 2280,
    },
  });

  const year = new Date().getFullYear();
  const slabs = [];
  for (let i = 1; i <= 8; i++) {
    const slab = await prisma.slab.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        batchId: batch.id,
        slabCode: `SL-${year}-${String(i).padStart(4, "0")}`,
        status: i <= 6 ? "in_stock" : i === 7 ? "in_cutting" : "sold",
        originalSizeL: 3000,
        originalSizeW: 1800,
        remainingSizeL: 3000,
        remainingSizeW: 1800,
        location: `Rack A-${i}`,
      },
    });
    slabs.push(slab);
  }

  await prisma.cutterMachine.createMany({
    data: [
      { tenantId: tenant.id, name: "Gang Saw 1", status: "cutting" },
      { tenantId: tenant.id, name: "Bridge Cutter 2", status: "idle" },
    ],
  });

  const workers = await Promise.all(
    [
      { name: "Vikram Singh", role: "cutter_operator", dailyWage: 800 },
      { name: "Suresh Kumar", role: "loader", dailyWage: 600 },
      { name: "Rajesh Patel", role: "polisher", dailyWage: 750 },
      { name: "Amit Verma", role: "helper", dailyWage: 500 },
    ].map((w) =>
      prisma.worker.create({
        data: { tenantId: tenant.id, ...w, joiningDate: new Date() },
      })
    )
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const worker of workers) {
    await prisma.attendance.create({
      data: {
        tenantId: tenant.id,
        workerId: worker.id,
        date: today,
        status: worker.name === "Amit Verma" ? "absent" : "present",
      },
    });
  }

  await prisma.task.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: "Cut slab for Sharma Traders",
        assignedWorkerId: workers[0].id,
        priority: "high",
        status: "in_progress",
        relatedSlabId: slabs[6]?.id,
      },
      {
        tenantId: tenant.id,
        title: "Load truck bay 3",
        assignedWorkerId: workers[1].id,
        priority: "medium",
        status: "in_progress",
      },
      {
        tenantId: tenant.id,
        title: "Polish Black Galaxy pieces",
        assignedWorkerId: workers[2].id,
        priority: "medium",
        status: "not_started",
      },
    ],
  });

  const client = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: "Sharma Traders",
      gstin: "08CCCCC0000C1Z5",
      state: "Rajasthan",
      phone: "+919811223344",
      address: "Jaipur, Rajasthan",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: "Delhi Interiors Pvt Ltd",
      gstin: "07DDDDD0000D1Z5",
      state: "Delhi",
      phone: "+919811223355",
      address: "Okhla, New Delhi",
    },
  });

  const orderData: {
    stage: ProductionStage;
    title: string;
    clientId: string;
    worker: string;
    days: number;
  }[] = [
    { stage: "new_order", title: "Kitchen countertop — Sharma Traders", clientId: client.id, worker: workers[0].id, days: 14 },
    { stage: "design_approval", title: "Bathroom vanity set", clientId: client2.id, worker: workers[0].id, days: 10 },
    { stage: "cutting", title: "Office reception flooring", clientId: client.id, worker: workers[0].id, days: 7 },
    { stage: "polishing", title: "Hotel lobby panels", clientId: client2.id, worker: workers[2].id, days: 5 },
    { stage: "finishing", title: "Residential staircase", clientId: client.id, worker: workers[2].id, days: 3 },
    { stage: "quality_check", title: "Showroom display slabs", clientId: client2.id, worker: workers[1].id, days: 2 },
    { stage: "ready_for_dispatch", title: "Mall flooring delivery", clientId: client.id, worker: workers[1].id, days: 1 },
    { stage: "delivered", title: "Villa project — Phase 1", clientId: client2.id, worker: workers[0].id, days: -3 },
  ];

  for (let i = 0; i < orderData.length; i++) {
    const od = orderData[i];
    const expected = new Date();
    expected.setDate(expected.getDate() + od.days);
    const delivery = new Date(expected);
    delivery.setDate(delivery.getDate() + 2);

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        clientId: od.clientId,
        orderNumber: `ORD-${year}-${String(i + 1).padStart(4, "0")}`,
        title: od.title,
        stage: od.stage,
        priority: i < 2 ? "high" : "medium",
        paymentStatus: i < 3 ? "unpaid" : i < 6 ? "partial" : "paid",
        assignedWorkerId: od.worker,
        expectedCompletion: expected,
        deliveryDate: delivery,
        totalAmount: 85000 + i * 15000,
        materialNotes: "Black Galaxy Granite, polished finish",
        items: {
          create: [
            {
              description: od.title,
              material: "Black Galaxy Granite",
              quantity: 45 + i * 5,
              unit: "sqft",
              rate: 185,
            },
          ],
        },
        stageEvents: {
          create: PRODUCTION_STAGES.slice(
            0,
            PRODUCTION_STAGES.indexOf(od.stage) + 1
          ).map((stage, idx) => ({
            stage,
            enteredAt: new Date(Date.now() - (PRODUCTION_STAGES.length - idx) * 86400000),
          })),
        },
      },
    });

    if (i === 0 && slabs[0]) {
      await prisma.slab.update({
        where: { id: slabs[0].id },
        data: { reservedForOrderId: order.id },
      });
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "payment",
        severity: "warning",
        title: "Payment overdue: Sharma Traders",
        body: "Invoice MP-2026-0042 is 5 days overdue",
        link: "/invoices",
      },
      {
        tenantId: tenant.id,
        type: "production",
        severity: "danger",
        title: "Production delayed: Office reception flooring",
        body: "Order past expected completion date",
        link: "/production",
      },
      {
        tenantId: tenant.id,
        type: "inventory",
        severity: "warning",
        title: "Low stock: Italian Carrara Marble",
        body: "Only 0 slabs remaining (min 3)",
        link: "/inventory",
      },
      {
        tenantId: tenant.id,
        type: "labour",
        severity: "info",
        title: "Absent today: Amit Verma",
        body: "Helper marked absent",
        link: "/labour/attendance",
      },
      {
        tenantId: tenant.id,
        type: "delivery",
        severity: "info",
        title: "Delivery tomorrow: Mall flooring",
        body: "Ready for dispatch — schedule transport",
        link: "/orders",
      },
    ],
  });

  await prisma.reminderSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      ownerPhone: "+919876543210",
      escalationDays: 3,
    },
  });

  const guideCount = await prisma.handlingGuideline.count({ where: { isGlobal: true } });
  if (guideCount === 0) {
    await prisma.handlingGuideline.createMany({
      data: [
        {
          isGlobal: true,
          materialKey: "marble",
          titleEn: "Marble handling",
          titleHi: "संगमरमर संभालना",
          dosEn: ["Use A-frame storage", "Keep surface covered", "Two-person lift over 80kg"],
          dontsEn: ["Do not drag on floor", "No acid cleaners"],
          dosHi: ["A-फ्रेम में रखें", "सतह ढककर रखें"],
          dontsHi: ["फर्श पर न खींचें"],
          storageTips: "Store vertically on A-frames; avoid direct sunlight for light marbles.",
          liftingTips: "Minimum 2 workers for slabs over 80kg.",
        },
        {
          isGlobal: true,
          materialKey: "granite",
          titleEn: "Granite handling",
          titleHi: "ग्रेनाइट संभालना",
          dosEn: ["Use clamps or suction cups", "Check slab cracks before lift"],
          dontsEn: ["Do not stand slabs flat on hard ground"],
          dosHi: ["क्लैंप या सक्शन कप का उपयोग करें"],
          dontsHi: ["स्लैब को सीधे जमीन पर न रखें"],
          cuttingTips: "Use granite blade; moderate feed speed with water.",
        },
      ],
    });
  }

  console.log("Seed complete:");
  console.log("  Login: owner@demo.marblepro.local / demo1234");
  console.log("  Tenant:", tenant.slug);
  console.log("  Client:", client.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
