const NotificationLog = require('../Model/NotificationLogModel');
const Patient = require('../Model/PatientModel');
const Dentist = require('../Model/DentistModel');
const nodemailer = require('nodemailer');

// Optional: Twilio WhatsApp (only if env set)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// -------- Helpers to resolve contacts --------
async function getPatientContact(patientCode) {
  const p = await Patient.findOne({ patientCode })
    .populate({ path: 'userId', select: 'name email contact_no' })
    .lean();
  if (!p) return null;
  return {
    name: p.userId?.name || 'Patient',
    email: p.userId?.email || null,
    phone: p.userId?.contact_no || null, // e.g., +9477xxxxxxx
  };
}

async function getDentistName(dentistCode) {
  const d = await Dentist.findOne({ dentistCode })
    .populate({ path: 'userId', select: 'name' })
    .lean();
  return d?.userId?.name || dentistCode;
}

// -------- Message templates --------
async function buildMessage(templateKey, meta = {}) {
  const { appointmentCode, dentistCode, date, time } = meta;
  const dentistName = dentistCode ? await getDentistName(dentistCode) : '';

  switch (templateKey) {
    case 'APPT_CONFIRMED': {
      const subject = `Appointment Confirmed: ${date} ${time}`;
      const body =
        `Hi,\n\nYour appointment (${appointmentCode}) is CONFIRMED.\n` +
        `Dentist: ${dentistName}\nDate: ${date}\nTime: ${time}\n\n` +
        `Thank you.\n`;
      return { subject, body };
    }
    case 'APPT_CANCELED': {
      const subject = `Appointment Canceled: ${appointmentCode}`;
      const body =
        `Hi,\n\nYour appointment (${appointmentCode}) has been CANCELED.\n` +
        `If this is unexpected, please contact reception.\n\nThank you.\n`;
      return { subject, body };
    }
    case 'APPT_REMINDER_24H': {
      const subject = `Reminder: Appointment in 24 hours`;
      const body =
        `Hi,\n\nThis is a reminder for your appointment (${appointmentCode}) in ~24 hours.\n` +
        `Dentist: ${dentistName}\nDate: ${date}\nTime: ${time}\n\nSee you soon!\n`;
      return { subject, body };
    }
    case 'DENTIST_DAILY_RUN': {
      const subject = `Today's Schedule Rundown`;
      const body =
        `Good morning,\n\nHere is your schedule for ${meta.date}.\n` +
        `${(meta.appointments || []).map(a => `• ${a.startTime?.toISOString?.().slice(11,16)} — ${a.patientCode} (${a.appointmentCode})`).join('\n')}\n`;
      return { subject, body };
    }
    default: {
      return { subject: templateKey, body: JSON.stringify(meta, null, 2) };
    }
  }
}

// -------- Channels: Email (default) / WhatsApp (optional) --------
function getMailTransport() {
  // Only create if env is present; else return null to fallback to console log.
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: !!(process.env.SMTP_SECURE === 'true'),
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined,
  });
}

async function sendEmail(to, subject, text) {
  const transporter = getMailTransport();
  if (!transporter) {
    console.log('[Notify][email:dryrun]', to, subject, text);
    return { id: 'dryrun-email' };
  }
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@clinic.local',
    to, subject, text
  });
  return { id: info.messageId };
}

async function sendWhatsApp(toE164, text) {
  if (!twilioClient || !process.env.TWILIO_WHATSAPP_FROM) {
    console.log('[Notify][wa:dryrun]', toE164, text);
    return { sid: 'dryrun-wa' };
  }
  const msg = await twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to:   `whatsapp:${toE164}`,
    body: text
  });
  return { sid: msg.sid };
}

// -------- Core: log + send now or queue --------
async function logAndSend({ recipientType, recipientCode, templateKey, channel = 'auto', scheduledFor = null, meta = {} }) {
  // Create log first (queued or sent)
  const log = await NotificationLog.create({
    recipientType,
    recipientCode,
    templateKey,
    channel: channel === 'auto' ? 'auto' : channel,
    scheduledFor,
    status: scheduledFor ? 'queued' : 'sent',
    sentAt: scheduledFor ? null : new Date(),
    meta,
  });

  // If scheduled, do not send now.
  if (scheduledFor) return log;

  try {
    const { subject, body } = await buildMessage(templateKey, meta);

    let chosen = 'console';
    // Resolve patient contact for patient notifications
    let contact = null;
    if (recipientType === 'Patient') {
      contact = await getPatientContact(recipientCode);
      if (!contact) throw new Error('Patient not found for notification');
    }

    // Choose channel: prefer WhatsApp if phone+Twilio available; else email if email+SMTP; else console
    if (channel === 'whatsapp' && contact?.phone) {
      await sendWhatsApp(contact.phone, body);
      chosen = 'whatsapp';
    } else if (channel === 'email' && contact?.email) {
      await sendEmail(contact.email, subject, body);
      chosen = 'email';
    } else {
      // AUTO
      if (contact?.phone && twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
        await sendWhatsApp(contact.phone, body);
        chosen = 'whatsapp';
      } else if (contact?.email) {
        await sendEmail(contact.email, subject, body);
        chosen = 'email';
      } else {
        console.log('[Notify][console]', recipientType, recipientCode, subject, body);
        chosen = 'console';
      }
    }

    // Update log with actual channel + sent timestamp
    await NotificationLog.updateOne({ _id: log._id }, { $set: { status: 'sent', sentAt: new Date(), channel: chosen } });
  } catch (err) {
    console.error('[Notify][error]', err);
    await NotificationLog.updateOne({ _id: log._id }, { $set: { status: 'failed', error: String(err) } });
  }

  return log;
}

// Convenience wrappers (same API you already use)
async function sendApptConfirmed(patientCode, meta) {
  return logAndSend({ recipientType: 'Patient', recipientCode: patientCode, templateKey: 'APPT_CONFIRMED', meta });
}
async function sendApptCanceled(patientCode, meta) {
  return logAndSend({ recipientType: 'Patient', recipientCode: patientCode, templateKey: 'APPT_CANCELED', meta });
}
async function scheduleApptReminder24h(patientCode, when, meta) {
  return logAndSend({ recipientType: 'Patient', recipientCode: patientCode, templateKey: 'APPT_REMINDER_24H', scheduledFor: when, meta });
}
async function sendDentistDailyRun(dentistCode, meta) {
  // For now we keep this logged; add dentist contact if you want to actually send to dentists too.
  return logAndSend({ recipientType: 'Dentist', recipientCode: dentistCode, templateKey: 'DENTIST_DAILY_RUN', meta });
}

// Cron: send any queued items that are due
async function processDueQueue() {
  const now = new Date();
  const due = await NotificationLog.find({ status: 'queued', scheduledFor: { $lte: now } }).limit(200).lean();
  for (const d of due) {
    // Reuse the API to actually send now (no longer queued)
    await NotificationLog.updateOne({ _id: d._id }, { $set: { status: 'sent', sentAt: new Date() } });
    try {
      if (d.recipientType === 'Patient') {
        const { subject, body } = await buildMessage(d.templateKey, d.meta || {});
        const contact = await getPatientContact(d.recipientCode);
        let chosen = 'console';
        if (contact?.phone && twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
          await sendWhatsApp(contact.phone, body); chosen = 'whatsapp';
        } else if (contact?.email) {
          await sendEmail(contact.email, subject, body); chosen = 'email';
        } else {
          console.log('[Notify][console queued]', d.recipientCode, subject, body);
          chosen = 'console';
        }
        await NotificationLog.updateOne({ _id: d._id }, { $set: { channel: chosen } });
      }
    } catch (e) {
      console.error('[Notify queued][error]', e);
      await NotificationLog.updateOne({ _id: d._id }, { $set: { status: 'failed', error: String(e) } });
    }
  }
}

module.exports = {
  sendApptConfirmed,
  sendApptCanceled,
  scheduleApptReminder24h,
  sendDentistDailyRun,
  processDueQueue
};
