import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
let url = "";
let key = "";
for (const line of envFile.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) {
    url = line.split("=").slice(1).join("=").trim().replace(/['"]/g, "");
  }
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) {
    key = line.split("=").slice(1).join("=").trim().replace(/['"]/g, "");
  }
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from("gigatech_vendedores").select("data_venda").limit(5).order("data_venda", { ascending: false });
  console.log("data_venda examples:", data);
}

run();
