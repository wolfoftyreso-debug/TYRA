import { query, withTransaction } from "@/lib/server/db";
import { getOrgPolicies } from "@/lib/server/orgPolicies";

type Channel = "sms" | "email" | "letter";

type ReminderTarget = {
  organizationId: string;
  customerId: string | null;
  customerName: string | null;
  customerLifecycleStatus: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddressLine1: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  customerCountry: string | null;
  vehicleId: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  mountedSeason: string | null;
  vehicleLifecycleStatus: string;
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
  kind: "season" | "law" | "pickup";
  targetSeason: "winter" | "summer";
  target: ReminderTarget;
  daysLeft?: number;
  attempt?: number;
  delivery?: "sms" | "email" | "letter";
}): { subject: string; body: string } {
  const name = input.target.customerName ?? "Hej";
  const v = vehicleLabel(input.target);

  if (input.kind === "pickup") {
    return {
      subject: `Påminnelse: hjul kvar hos verkstaden (${input.target.registrationNumber})`,
      body: `${name}!\n\nVi har ett hjulset kvar hos oss för ${v}.\nHör av dig så löser vi utlämning eller hur du vill göra.\n\n/ TYRA`
    };
  }

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
    customer_lifecycle_status: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    address_line1: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    vehicle_id: string;
    registration_number: string;
    make: string | null;
    model: string | null;
    mounted_season: string | null;
    lifecycle_status: string;
    remind_season: boolean | null;
  }>(
    `select
       v.organization_id as organization_id,
       v.customer_id as customer_id,
       c.name as customer_name,
       c.lifecycle_status as customer_lifecycle_status,
       c.phone as customer_phone,
       c.email as customer_email,
       c.address_line1 as address_line1,
       c.postal_code as postal_code,
       c.city as city,
       c.country as country,
       v.id as vehicle_id,
       v.registration_number as registration_number,
       v.make as make,
       v.model as model,
       v.lifecycle_status as lifecycle_status,
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
    customerLifecycleStatus: r.customer_lifecycle_status,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerAddressLine1: r.address_line1,
    customerPostalCode: r.postal_code,
    customerCity: r.city,
    customerCountry: r.country,
    vehicleId: r.vehicle_id,
    registrationNumber: r.registration_number,
    make: r.make,
    model: r.model,
    mountedSeason: r.mounted_season,
    vehicleLifecycleStatus: r.lifecycle_status,
    remindSeason: r.remind_season !== false
  }));
}

async function getOrCreateThread(input: {
  organizationId: string;
  vehicleId?: string | null;
  wheelSetId?: string | null;
  threadKey: string;
}) {
  const res = await query<{
    id: string;
    status: string;
    attempt_count: number;
    escalated_at: string | null;
    stopped_reason: string | null;
  }>(
    `insert into reminder_threads (organization_id, vehicle_id, wheel_set_id, thread_key)
     values ($1,$2,$3,$4)
     on conflict (organization_id, thread_key) do update set updated_at = now()
     returning id, status, attempt_count, escalated_at, stopped_reason`,
    [input.organizationId, input.vehicleId ?? null, input.wheelSetId ?? null, input.threadKey]
  );
  return res.rows[0]!;
}

async function incrementAttempt(input: { threadId: string }) {
  const res = await query<{ attempt_count: number }>(
    `update reminder_threads
     set attempt_count = attempt_count + 1,
         last_attempt_at = now(),
         updated_at = now()
     where id = $1
     returning attempt_count`,
    [input.threadId]
  );
  return res.rows[0]!.attempt_count;
}

async function markEscalated(input: { threadId: string }) {
  await query(
    `update reminder_threads
     set escalated_at = now(), updated_at = now()
     where id = $1 and escalated_at is null`,
    [input.threadId]
  );
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
  const policies = await getOrgPolicies({ organizationId: input.organizationId });

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
    if ((t.vehicleLifecycleStatus ?? "ACTIVE") === "SOLD") {
      continue;
    }
    if ((t.customerLifecycleStatus ?? "ACTIVE") === "DECEASED") {
      continue;
    }
    if (!t.remindSeason) {
      skippedPrefsOff++;
      continue;
    }

    const channel = chooseChannel(t);
    // For letter escalation we can proceed even without phone/email, but we do prefer a direct channel for first attempts.

    const mounted = (t.mountedSeason ?? "").toLowerCase();

    // Season reminders
    if (now >= winterSeasonWindowStart && now <= winterSeasonWindowEnd && mounted && mounted !== "winter") {
      await withTransaction(async () => {
        const thread = await getOrCreateThread({
          organizationId: t.organizationId,
          vehicleId: t.vehicleId,
          threadKey: `season:winter:${year}:${t.vehicleId}`
        });
        if (thread.status !== "OPEN") return;
        if (thread.attempt_count < 3) {
          if (!channel) {
            skippedNoContact++;
            return;
          }
          const attempt = await incrementAttempt({ threadId: thread.id });
          const reminderKey = `season:winter:${year}:${t.vehicleId}:attempt:${attempt}`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const msg = buildMessage({ kind: "season", targetSeason: "winter", target: t, attempt, delivery: channel.channel });
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
          return;
        }
        if (!thread.escalated_at) {
          const reminderKey = `season:winter:${year}:${t.vehicleId}:letter`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const letterRecipient = t.customerAddressLine1
            ? `${t.customerName ?? "Kund"}\n${t.customerAddressLine1}\n${t.customerPostalCode ?? ""} ${t.customerCity ?? ""}\n${t.customerCountry ?? "SE"}`
            : `${t.customerName ?? "Kund"} (saknar adress)`;
          const msg = buildMessage({ kind: "season", targetSeason: "winter", target: t, delivery: "letter" });
          const outboxId = await createOutbox({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            channel: "letter",
            recipient: letterRecipient,
            subject: `REKOMMENDERAT BREV: ${msg.subject}`,
            body: `${msg.body}\n\n---\nÅtgärd: Skicka rekommenderat brev (manuellt).`
          });
          await attachOutboxToDelivery({ deliveryId, outboxId });
          await markEscalated({ threadId: thread.id });
          enqueued++;
        }
      });
    }

    if (now >= summerSeasonWindowStart && now <= summerSeasonWindowEnd && mounted && mounted !== "summer") {
      await withTransaction(async () => {
        const thread = await getOrCreateThread({
          organizationId: t.organizationId,
          vehicleId: t.vehicleId,
          threadKey: `season:summer:${year}:${t.vehicleId}`
        });
        if (thread.status !== "OPEN") return;
        if (thread.attempt_count < 3) {
          if (!channel) {
            skippedNoContact++;
            return;
          }
          const attempt = await incrementAttempt({ threadId: thread.id });
          const reminderKey = `season:summer:${year}:${t.vehicleId}:attempt:${attempt}`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const msg = buildMessage({ kind: "season", targetSeason: "summer", target: t, attempt, delivery: channel.channel });
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
          return;
        }
        if (!thread.escalated_at) {
          const reminderKey = `season:summer:${year}:${t.vehicleId}:letter`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const letterRecipient = t.customerAddressLine1
            ? `${t.customerName ?? "Kund"}\n${t.customerAddressLine1}\n${t.customerPostalCode ?? ""} ${t.customerCity ?? ""}\n${t.customerCountry ?? "SE"}`
            : `${t.customerName ?? "Kund"} (saknar adress)`;
          const msg = buildMessage({ kind: "season", targetSeason: "summer", target: t, delivery: "letter" });
          const outboxId = await createOutbox({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            channel: "letter",
            recipient: letterRecipient,
            subject: `REKOMMENDERAT BREV: ${msg.subject}`,
            body: `${msg.body}\n\n---\nÅtgärd: Skicka rekommenderat brev (manuellt).`
          });
          await attachOutboxToDelivery({ deliveryId, outboxId });
          await markEscalated({ threadId: thread.id });
          enqueued++;
        }
      });
    }

    // Law warnings (within 14 days of Dec 1, once per year/vehicle)
    const withinLawWindow = now < winterLawDeadline && daysUntil(now, winterLawDeadline) <= 14;
    if (withinLawWindow && mounted && mounted !== "winter") {
      const daysLeft = Math.max(0, daysUntil(now, winterLawDeadline));
      await withTransaction(async () => {
        const thread = await getOrCreateThread({
          organizationId: t.organizationId,
          vehicleId: t.vehicleId,
          threadKey: `law:winter:${year}:${t.vehicleId}`
        });
        if (thread.status !== "OPEN") return;
        if (thread.attempt_count < 3) {
          if (!channel) {
            skippedNoContact++;
            return;
          }
          const attempt = await incrementAttempt({ threadId: thread.id });
          const reminderKey = `law:winter:${year}:${t.vehicleId}:attempt:${attempt}`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const msg = buildMessage({ kind: "law", targetSeason: "winter", target: t, daysLeft, attempt, delivery: channel.channel });
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
          return;
        }
        if (!thread.escalated_at) {
          const reminderKey = `law:winter:${year}:${t.vehicleId}:letter`;
          const deliveryId = await tryCreateDelivery({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            reminderKey
          });
          if (!deliveryId) return;
          const letterRecipient = t.customerAddressLine1
            ? `${t.customerName ?? "Kund"}\n${t.customerAddressLine1}\n${t.customerPostalCode ?? ""} ${t.customerCity ?? ""}\n${t.customerCountry ?? "SE"}`
            : `${t.customerName ?? "Kund"} (saknar adress)`;
          const msg = buildMessage({ kind: "law", targetSeason: "winter", target: t, daysLeft, delivery: "letter" });
          const outboxId = await createOutbox({
            organizationId: t.organizationId,
            customerId: t.customerId,
            vehicleId: t.vehicleId,
            channel: "letter",
            recipient: letterRecipient,
            subject: `REKOMMENDERAT BREV: ${msg.subject}`,
            body: `${msg.body}\n\n---\nÅtgärd: Skicka rekommenderat brev (manuellt).`
          });
          await attachOutboxToDelivery({ deliveryId, outboxId });
          await markEscalated({ threadId: thread.id });
          enqueued++;
        }
      });
    }
  }

  // Forgotten wheels: wheel_sets marked as FORGOTTEN_LEFT_BEHIND and still stored
  const forgotten = await query<{
    wheel_set_id: string;
    vehicle_id: string | null;
    customer_id: string | null;
    customer_name: string | null;
    customer_lifecycle_status: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    address_line1: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    registration_number: string | null;
    make: string | null;
    model: string | null;
    lifecycle_status: string | null;
    remind_season: boolean | null;
  }>(
    `select
       ws.id as wheel_set_id,
       ws.vehicle_id as vehicle_id,
       ws.customer_id as customer_id,
       c.name as customer_name,
       c.lifecycle_status as customer_lifecycle_status,
       c.phone as customer_phone,
       c.email as customer_email,
       c.address_line1 as address_line1,
       c.postal_code as postal_code,
       c.city as city,
       c.country as country,
       v.registration_number as registration_number,
       v.make as make,
       v.model as model,
       v.lifecycle_status as lifecycle_status,
       coalesce(p.remind_season, true) as remind_season
     from wheel_sets ws
     left join customers c on c.organization_id = ws.organization_id and c.id = ws.customer_id
     left join vehicles v on v.organization_id = ws.organization_id and v.id = ws.vehicle_id
     left join customer_communication_preferences p on p.organization_id = ws.organization_id and p.customer_id = ws.customer_id
     where ws.organization_id = $1
       and ws.disposition_status = 'FORGOTTEN_LEFT_BEHIND'
       and ws.storage_status = 'STORED'`,
    [input.organizationId]
  );

  for (const r of forgotten.rows) {
    const t: ReminderTarget = {
      organizationId: input.organizationId,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerLifecycleStatus: r.customer_lifecycle_status,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email,
      customerAddressLine1: r.address_line1,
      customerPostalCode: r.postal_code,
      customerCity: r.city,
      customerCountry: r.country,
      vehicleId: r.vehicle_id ?? "",
      registrationNumber: r.registration_number ?? "—",
      make: r.make,
      model: r.model,
      mountedSeason: null,
      vehicleLifecycleStatus: r.lifecycle_status ?? "ACTIVE",
      remindSeason: r.remind_season !== false
    };
    if (t.vehicleLifecycleStatus === "SOLD") continue;
    if ((t.customerLifecycleStatus ?? "ACTIVE") === "DECEASED") continue;

    const channel = chooseChannel(t);
    await withTransaction(async () => {
      const thread = await getOrCreateThread({
        organizationId: t.organizationId,
        vehicleId: r.vehicle_id,
        wheelSetId: r.wheel_set_id,
        threadKey: `pickup:wheels:${r.wheel_set_id}`
      });
      if (thread.status !== "OPEN") return;
      if (thread.attempt_count < 3) {
        if (!channel) {
          skippedNoContact++;
          return;
        }
        const attempt = await incrementAttempt({ threadId: thread.id });
        const reminderKey = `pickup:wheels:${r.wheel_set_id}:attempt:${attempt}`;
        const deliveryId = await tryCreateDelivery({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: r.vehicle_id ?? t.vehicleId,
          reminderKey
        });
        if (!deliveryId) return;
        const msg = buildMessage({ kind: "pickup", targetSeason: "winter", target: t, attempt, delivery: channel.channel });
        const outboxId = await createOutbox({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: r.vehicle_id,
          channel: channel.channel,
          recipient: channel.recipient,
          subject: msg.subject,
          body: msg.body
        });
        await attachOutboxToDelivery({ deliveryId, outboxId });
        enqueued++;
        return;
      }
      if (!thread.escalated_at) {
        const reminderKey = `pickup:wheels:${r.wheel_set_id}:letter`;
        const deliveryId = await tryCreateDelivery({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: r.vehicle_id ?? t.vehicleId,
          reminderKey
        });
        if (!deliveryId) return;
        const letterRecipient = t.customerAddressLine1
          ? `${t.customerName ?? "Kund"}\n${t.customerAddressLine1}\n${t.customerPostalCode ?? ""} ${t.customerCity ?? ""}\n${t.customerCountry ?? "SE"}`
          : `${t.customerName ?? "Kund"} (saknar adress)`;
        const msg = buildMessage({ kind: "pickup", targetSeason: "winter", target: t, delivery: "letter" });
        const outboxId = await createOutbox({
          organizationId: t.organizationId,
          customerId: t.customerId,
          vehicleId: r.vehicle_id,
          channel: "letter",
          recipient: letterRecipient,
          subject: `REKOMMENDERAT BREV: ${msg.subject}`,
          body: `${msg.body}\n\n---\nÅtgärd: Skicka rekommenderat brev (manuellt).`
        });
        await attachOutboxToDelivery({ deliveryId, outboxId });
        await markEscalated({ threadId: thread.id });
        enqueued++;
      }
    });
  }

  // Disposal policy: after escalation, keep forgotten wheel sets for N days then dispose.
  const disposeAfterDays = Math.max(0, policies.forgotten_dispose_after_days ?? 60);
  if (disposeAfterDays >= 0) {
    const due = await query<{
      thread_id: string;
      wheel_set_id: string;
      escalated_at: string;
    }>(
      `select rt.id as thread_id, rt.wheel_set_id as wheel_set_id, rt.escalated_at as escalated_at
       from reminder_threads rt
       join wheel_sets ws
         on ws.organization_id = rt.organization_id and ws.id = rt.wheel_set_id
       where rt.organization_id = $1
         and rt.status = 'OPEN'
         and rt.thread_key like 'pickup:wheels:%'
         and rt.escalated_at is not null
         and rt.escalated_at <= now() - ($2::text || ' days')::interval
         and ws.disposition_status = 'FORGOTTEN_LEFT_BEHIND'
         and ws.storage_status = 'STORED'`,
      [input.organizationId, disposeAfterDays]
    );

    for (const d of due.rows) {
      await withTransaction(async () => {
        await query(
          `update wheel_sets
           set disposition_status = 'DISPOSED',
               disposition_notes = 'Auto-kasserad efter eskalering (policy: ' || $3::text || ' dagar)',
               updated_at = now()
           where organization_id = $1 and id = $2 and disposition_status = 'FORGOTTEN_LEFT_BEHIND'`,
          [input.organizationId, d.wheel_set_id, disposeAfterDays]
        );
        await query(
          `update reminder_threads
           set status = 'STOPPED',
               stopped_reason = 'DISPOSED_AFTER_ESCALATION',
               stopped_at = now(),
               updated_at = now()
           where id = $1 and status = 'OPEN'`,
          [d.thread_id]
        );
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

