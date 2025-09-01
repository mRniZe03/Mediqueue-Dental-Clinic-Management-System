// Jobs/notificationCron.js
const cron = require('node-cron');
const Appointment = require('../Model/AppointmentModel');
const NotificationLog = require('../Model/NotificationLogModel'); // NEW: for de-dup
const { sendDentistDailyRun, scheduleApptReminder24h, processDueQueue } = require('../Services/NotificationService');

// Dentist daily rundown at 06:00 Asia/Colombo
cron.schedule('0 6 * * *', async () => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const start = new Date(`${today}T00:00:00.000Z`);
    const end   = new Date(`${today}T23:59:59.999Z`);

    const appts = await Appointment.aggregate([
      { $match: { status: 'confirmed', appointment_date: { $gte: start, $lte: end } } },
      { $group: { _id: '$dentist_code', list: { $push: { appointmentCode: '$appointmentCode', patientCode: '$patient_code', startTime: '$appointment_date' } } } }
    ]);

    for (const d of appts) {
      await sendDentistDailyRun(d._id, { date: today, appointments: d.list });
    }
  } catch (e) { console.error('[cron daily run]', e); }
}, { timezone: 'Asia/Colombo' }); // NEW

// 24h reminders + send queued notifications every 10 minutes (Asia/Colombo)
cron.schedule('*/10 * * * *', async () => {
  try {
    const now = new Date();
    // window ~ 24h from now ±10m
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 10 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000);

    const appts = await Appointment.find({
      status: 'confirmed',
      appointment_date: { $gte: windowStart, $lte: windowEnd }
    }).select('appointmentCode patient_code dentist_code appointment_date').lean();

    for (const a of appts) {
      // Schedule at T - 24h (FIX)
      const remindAt = new Date(a.appointment_date.getTime() - 24 * 60 * 60 * 1000);

      // De-dup so we don't queue multiple reminders while the window overlaps (OPTIONAL but recommended)
      const exists = await NotificationLog.exists({
        templateKey: 'APPT_REMINDER_24H',
        recipientType: 'Patient',
        recipientCode: a.patient_code,
        'meta.appointmentCode': a.appointmentCode,
      });
      if (exists) continue;

      await scheduleApptReminder24h(
        a.patient_code,
        remindAt,
        {
          appointmentCode: a.appointmentCode,
          dentistCode: a.dentist_code,
          date: a.appointment_date.toISOString().slice(0,10),
          time: a.appointment_date.toISOString().slice(11,16)
        }
      );
    }

    // Dispatch any due queued messages
    await processDueQueue();
  } catch (e) { console.error('[cron reminders/send]', e); }
}, { timezone: 'Asia/Colombo' }); // NEW

module.exports = cron;
