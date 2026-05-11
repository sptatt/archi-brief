export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Hello from ARCHI backend',
    now: new Date().toISOString(),
  });
}
