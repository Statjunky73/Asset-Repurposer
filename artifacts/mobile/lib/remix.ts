import { apiUrl } from "@/lib/apiBase";

export async function callRemix(text: string, instruction: string): Promise<string> {
  const res = await fetch(apiUrl("/api/remix"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, instruction }),
  });
  if (!res.ok) throw new Error("Remix failed");
  const data = await res.json();
  return data.result;
}
