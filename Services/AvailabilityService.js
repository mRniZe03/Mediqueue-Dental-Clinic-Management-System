const Dentist = require('../Model/DentistModel');
const ClinicEvent = require('../Model/ClinicEventModel');
const Appointment = require('../Model/AppointmentModel');
const { getDayNameUTC, dayStartUTC, dayEndUTC, overlap } = require('../utils/time');

function parseWindow(hhmmRange) {
  if (!hhmmRange || typeof hhmmRange !== 'string') return null;
  const [a, b] = hhmmRange.split('-');
  if (!a || !b) return null;
  const [sh, sm] = a.split(':').map(Number);
  const [eh, em] = b.split(':').map(Number);
  const startMin = sh * 60 + (sm || 0);
  const endMin = eh * 60 + (em || 0);
  if (Number.isNaN(startMin) || Number.isNaN(endMin) || endMin <= startMin) return null;
  return { startMin, endMin };
}
function dateAt(dateStr, minutesFromMidnight) {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(base.getTime() + minutesFromMidnight * 60 * 1000);
}
function generateSlotStarts(win, slotMinutes) {
  const starts = [];
  for (let t = win.startMin; t + slotMinutes <= win.endMin; t += slotMinutes) starts.push(t);
  return starts;
}

async function getBookableSlotsByCodes(dentistCode, dateStr, slotMinutes = 30) {
  const dentist = await Dentist.findOne({ dentistCode })
    .populate({ path: 'userId', select: 'name isActive' }).lean();
  if (!dentist) throw Object.assign(new Error('Dentist not found'), { status: 404 });
  if (!dentist.userId?.isActive) throw Object.assign(new Error('Dentist not active'), { status: 409 });

  const dayName = getDayNameUTC(dateStr);
  const rule = dentist.availability_schedule?.[dayName];
  const win = parseWindow(rule);
  if (!win) return { dentist, workingWindow: null, slotMinutes, slots: [] };

  const dayStart = dayStartUTC(dateStr);
  const dayEnd   = dayEndUTC(dateStr);

  const [events, appts] = await Promise.all([
    ClinicEvent.find({ isPublished: true, startDate: { $lt: dayEnd }, endDate: { $gt: dayStart } })
      .select('eventType startDate endDate allDay title').lean(),
    Appointment.find({
      dentist_code: dentistCode,
      status: { $in: ['pending','confirmed'] },
      appointment_date: { $gte: dayStart, $lt: dayEnd }
    }).select('appointment_date status appointmentCode').lean(),
  ]);

  const mins = Math.max(10, Math.min(180, parseInt(slotMinutes, 10) || 30));
  const starts = generateSlotStarts(win, mins);

  const slots = starts.map(startMin => {
    const s = dateAt(dateStr, startMin);
    const e = dateAt(dateStr, startMin + mins);
    // event block
    if (events.some(ev => overlap(s, e, ev.startDate, ev.endDate))) return { start: s, end: e, status: 'blocked_event' };
    // booked if an appt starts exactly at this slot
    if (appts.some(a => new Date(a.appointment_date).getTime() === s.getTime())) return { start: s, end: e, status: 'booked' };
    return { start: s, end: e, status: 'bookable' };
  });

  return {
    dentist,
    workingWindow: {
      dayName,
      from: `${String(Math.floor(win.startMin / 60)).padStart(2,'0')}:${String(win.startMin % 60).padStart(2,'0')}`,
      to:   `${String(Math.floor(win.endMin / 60)).padStart(2,'0')}:${String(win.endMin % 60).padStart(2,'0')}`,
    },
    slotMinutes: mins,
    slots,
  };
}

module.exports = { getBookableSlotsByCodes };
