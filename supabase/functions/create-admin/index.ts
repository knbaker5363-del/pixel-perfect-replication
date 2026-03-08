import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password, full_name, action } = await req.json();

  if (action === "reset") {
    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Ensure admin role
    await supabase.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ success: true, user_id: user.id }));
  }

  // Create new user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  await supabase.from("user_roles").insert({ user_id: userData.user.id, role: "admin" });

  return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
