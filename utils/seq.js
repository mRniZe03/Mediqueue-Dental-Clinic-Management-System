const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const ymd = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const pad = (n, width) => String(n).padStart(width, '0');

module.exports = { startOfDay, ymd, pad };
