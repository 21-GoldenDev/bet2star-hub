import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function findAuthUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find(
      (user) => typeof user.email === "string" && user.email.toLowerCase() === normalizedEmail
    );
    if (match) return match;
    if (users.length < 1000) return null;
    page += 1;
  }
}

const MIN_PASSWORD_LENGTH = 6;

async function provisionUser({ email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = String(password || "");
  if (!normalizedEmail || !normalizedPassword) return "skipped";
  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    return `skipped (password shorter than ${MIN_PASSWORD_LENGTH} characters)`;
  }

  const authUser = await findAuthUserByEmail(normalizedEmail);
  const userMetadata = { role };

  if (authUser) {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    return "updated";
  }

  const { error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error) throw error;
  return "created";
}

async function main() {
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("username,email,password,status")
    .eq("status", "active");
  if (staffError) throw staffError;

  const { data: agents, error: agentError } = await supabase
    .from("agent")
    .select("username,email,password,status")
    .eq("status", "active");
  if (agentError) throw agentError;

  for (const row of staff || []) {
    const result = await provisionUser({ email: row.email, password: row.password, role: "staff" });
    console.log(`staff ${row.username}: ${result}`);
  }

  for (const row of agents || []) {
    const result = await provisionUser({ email: row.email, password: row.password, role: "agent" });
    console.log(`agent ${row.username}: ${result}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
