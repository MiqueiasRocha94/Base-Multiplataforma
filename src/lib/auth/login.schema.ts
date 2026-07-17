import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um email valido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});
