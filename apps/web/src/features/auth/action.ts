'use server'

import { redirect } from "next/navigation";
import { authServerSchema } from "./server.schema";
import { AUTH_INTENT } from "./constants";
import { includes } from "zod";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>; 
}

export async function authAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = authServerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }    
  }

  const {intent, ...data} = parsed.data;
  
  switch (intent) {
    case AUTH_INTENT.LOGIN: {
      const res = await fetch(`${process.env.API_URL}/auth/login`, 
        {
          method: 'POST', 
          headers: {'Content-Type': 'application/json'},
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json();
          return { error: body.message ?? 'Login Failed' }
        }
        break;
      }
      case AUTH_INTENT.REGISTER: {
      const res = await fetch(`${process.env.API_URL}/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();

        return { error: body.message ?? "Registration Failed" }
      }
      break;
    }
  }

  redirect("/dashboard")
}