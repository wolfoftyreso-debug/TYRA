import { query, withTransaction } from "@/lib/server/db";

type Channel = "sms" | "email";

type ReminderTarget = {
  organizationId: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicleId: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  mountedSeason: string | null;
  remindSeason: boolean;
};

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysUntil(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function chooseChannel(t: ReminderTarget): { channel: Channel; recipient: string } | null {
  const phone = t.customerPhone?.trim() || null;
  if (phone) return { channel: "sms", recipient: phone };
  const email = t.customerEmail?.trim() || null;
  if (email) return { channel: "email", recipient: email };
  return null;
}

function vehicleLabel(t: ReminderTarget) {
  const car = [t.make, t.model].filter(Boolean).join(" ").trim();
  return car ? `${t.registrationNumber} (${car})` : t.registrationNumber;
}

function buildMessage(input: {
  kind: "season" | "law";
  targetSeason: "winter" | "summer";
  target: ReminderTarget;
  daysLeft?: number;
}): { subject: string; body: string } {
  const name = input.target.customerName ?? "Hej";
  const v = vehicleLabel(input.target);

  if (input.kind === "season" && input.targetSeason === "winter") {
    return {
      subject: `Påminnelse: dags att byta till vinterhjul (${input.target.registrationNumber})`,
      body: `${name}!\n\nDet börjar bli dags att byta till vinterhjul för ${v}.\nVill du att vi bokar en tid och förbereder hjulen?\n\n/ TYRA`
    };
  }
  if (input.kind === "season" && input.targetSeason === "summer") {
    return {
      subject: `Påminnelse: dags att byta till sommarhjul (${input.target.registrationNumber})`,
      body: `${name}!\n\nDet börjar bli dags att byta till sommarhjul för ${v}.\nVill du att vi bokar en tid och förbereder hjulen?\n\n/ TYRA`
    };
  }
  if (input.kind === "law" && input.targetSeason === "winter") {
    const left = input.daysLeft != null ? ` Det är ${input.daysLeft} dagar kvar.` : "";
    return {
      subject: `Viktigt: vinterdäck närmar sig (${input.target.registrationNumber})`,
      body: `${name}!\n\nFör ${v} verkar du inte ha vinterhjul monterade just nu.${left}\nBehöver du hjälp att byta i tid? Svara på detta meddelande eller boka en tid.\n\n/ TYRA`
    };
  }
  return {
    subject: `Påminnelse (${input.target.registrationNumber})`,
    body: `${name}!\n\nPåminnelse för ${v}.\n\n/ TYRA`
  };
}

async function listTargets(input: { organizationId: string }): Promise<ReminderTarget[]> {
  const res = await query<{
    organization_id: string;
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    vehicle_id: string;
    registration_number: string;
    make: string | null;
    model: string | null;
    mounted_season: string | null;
    remind_season: boolean | null;
  }>(
    `select
       v.organization_id as organization_id,
       v.customer_id as customer_id,
       c.name as customer_name,
       c.phone as customer_phone,
       c.email as customer_email,
       v.id as vehicle_id,
       v.registration_number as registration_number,
       v.make as make,
       v.model as model,
       (
         select ws.season
         from wheel_sets ws
         where ws.organization_id = v.organization_id
           and ws.vehicle_id = v.id
           and ws.status = 'MOUNTED'
         order by ws.updated_at desc
         limit 1
       ) as mounted_season,
       coalesce(p.remind_season, true) as remind_season
     from vehicles v
     left join customers c
       on c.organization_id = v.organization_id and c.id = v.customer_id
     left join customer_communication_preferences p
       on p.organization_id = v.organization_id and p.customer_id = v.customer_id
     where v.organization_id = $1`,
    [input.organizationId]
  );
  return res.rows.map((r) => ({
    organizationId: r.organization_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    vehicleId: r.vehicle_id,
    registrationNumber: r.registration_number,
    make: r.make,
    model: r.model,
    mountedSeason: r.mounted_season,
    remindSeason: r.remind_season !== false
  }));
}

async function tryCreateDelivery(input: {
  organizationId: string;
  customerId: string | null;
  vehicleId: string;
  reminderKey: string;
}) {
  const res = await query<{ id: string }>(
    `insert into reminder_deliveries (organization_id, customer_id, vehicle_id, reminder_key)
     values ($1,$2,$3,$4)
     on conflict (organization_id, vehicle_id, reminder_key) do nothing
     returning id`,
    [input.organizationId, input.customerId, input.vehicleId, input.reminderKey]
  );
  return res.rows[0]?.id ?? null;
}

async function createOutbox(input: {
  organizationId: string;
  customerId: string | null;
  vehicleId: string | null;
  channel: Channel;
  recipient: string;
  subject: string | null;
  body: string;
}) {
  const res = await query<{ id: string }>(
    `insert into reminder_outbox (organization_id, customer_id, vehicle_id, channel, recipient, subject, body)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id`,
    [input.organizationId, input.customerId, input.vehicleId, input.channel, input.recipient, input.subject, input.body]
  );
  return res.rows[0]!.id;
}

async function attachOutboxToDelivery(input: { deliveryId: string; outboxId: string }) {
  await query(`update reminder_deliveries set outbox_id = $2 where id = $1`, [input.deliveryId, input.outboxId]);
}

export type ReminderRunResult = {
  organizationId: string;
  evaluatedTargets: number;
  enqueued: number;
  skippedNoContact: number;
  skippedPrefsOff: number;
};

export async function runSeasonAndLawReminders(input: {
  organizationId: string;
  now?: Date;
}): Promise<ReminderRunResult> {
  const now = input.now ?? new Date();
  const year = now.getFullYear();

  // Sweden defaults (v1). Later: org-specific policies.
  const winterSeasonWindowStart = new Date(`${year}-10-01T00:00:00.000Z`);
  const winterSeasonWindowEnd = new Date(`${year}-11-15T23:59:59.999Z`);
  const winterLawDeadline = new Date(`${year}-12-01T00:00:00.000Z`);

  const summerSeasonWindowStart = new Date(`${year}-03-15T00:00:00.000Z`);
  const summerSeasonWindowEnd = new Date(`${year}-04-30T23:59:59.999Z`);

  const targets = await listTargets({ organizationId: input.organizationId });

  let enqueued = 0;
  let skippedNoContact = 0;
  let skippedPrefsOff = 0;

  for (const t of targets) {
    if (!t.remindSeason) {
      skippedPrefsOff++;
      continue;
    }

    const channel = chooseChannel(t);
    if (!channel) {
      skippedNoContact++;
      continue;
    }

    const mounted = (t.mountedSeason ?? "").toLowerCase();

    // Season reminders
    if (now >= winterSeasonWindowStart && now <= winterSeasonWindowEnd && mounted && mounted !== "winter") {
      const reminderKey = `season:winter:${year}:${t.vehicleId}`;
      await withTransaction(async () => {
        const deliveryId = await tryCreateDelivery({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          reminderKey
        });
        if (!deliveryId) return;
        const msg = buildMessage({ kind: "season", targetSeason: "winter", target: t });
        const outboxId = await createOutbox({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          channel: channel.channel,
          recipient: channel.recipient,
          subject: msg.subject,
          body: msg.body
        });
        await attachOutboxToDelivery({ deliveryId, outboxId });
        enqueued++;
      });
    }

    if (now >= summerSeasonWindowStart && now <= summerSeasonWindowEnd && mounted && mounted !== "summer") {
      const reminderKey = `season:summer:${year}:${t.vehicleId}`;
      await withTransaction(async () => {
        const deliveryId = await tryCreateDelivery({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          reminderKey
        });
        if (!deliveryId) return;
        const msg = buildMessage({ kind: "season", targetSeason: "summer", target: t });
        const outboxId = await createOutbox({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          channel: channel.channel,
          recipient: channel.recipient,
          subject: msg.subject,
          body: msg.body
        });
        await attachOutboxToDelivery({ deliveryId, outboxId });
        enqueued++;
      });
    }

    // Law warnings (within 14 days of Dec 1, once per year/vehicle)
    const withinLawWindow = now < winterLawDeadline && daysUntil(now, winterLawDeadline) <= 14;
    if (withinLawWindow && mounted && mounted !== "winter") {
      const daysLeft = Math.max(0, daysUntil(now, winterLawDeadline));
      const reminderKey = `law:winter:${year}:${t.vehicleId}`;
      await withTransaction(async () => {
        const deliveryId = await tryCreateDelivery({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          reminderKey
        });
        if (!deliveryId) return;
        const msg = buildMessage({ kind: "law", targetSeason: "winter", target: t, daysLeft });
        const outboxId = await createOutbox({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: t.vehicleId,
          channel: channel.channel,
          recipient: channel.recipient,
          subject: msg.subject,
          body: msg.body
        });
        await attachOutboxToDelivery({ deliveryId, outboxId });
        enqueued++;
      });
    }
  }

  // Record run
  await query(
    `insert into reminder_runs (organization_id, kind, stats)
     values ($1,'all',$2)`,
    [
      input.organizationId,
      JSON.stringify({
        date: isoDateOnly(now),
        evaluatedTargets: targets.length,
        enqueued,
        skippedNoContact,
        skippedPrefsOff
      })
    ]
  );

  return {
    organizationId: input.organizationId,
    evaluatedTargets: targets.length,
    enqueued,
    skippedNoContact,
    skippedPrefsOff
  };
}

