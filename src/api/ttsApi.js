// Pointing to your Node.js Proxy
const API_BASE_URL = "http://localhost:3000/api";

export const startAudioGeneration = async (text, model, voice) => {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text }) 
  });

  if (!response.ok) {
    throw new Error("Failed to queue task");
  }

  const data = await response.json();
  return data.task_id;
};

export const checkAudioStatus = async (taskId) => {
  const response = await fetch(`${API_BASE_URL}/status/${taskId}`);
  
  if (!response.ok) {
    throw new Error("Failed to check status");
  }

  return await response.json();
};