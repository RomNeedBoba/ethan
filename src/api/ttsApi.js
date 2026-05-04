// HARD FIX: no env vars, no localhost.
// This will work immediately on Vercel as long as your Cloudflare tunnel is running.
const API_BASE_URL = "https://revenue-fellowship-amend-cultures.trycloudflare.com/api";

export const startAudioGeneration = async (text) => {
  const res = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to queue task: ${res.status} ${msg}`);
  }

  const data = await res.json();
  return data.task_id;
};

export const checkAudioStatus = async (taskId) => {
  const res = await fetch(`${API_BASE_URL}/status/${taskId}`);

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to check status: ${res.status} ${msg}`);
  }

  return await res.json();
};
