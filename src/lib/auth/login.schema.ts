import { z } from "zod";

// Login: usuario (nao necessariamente e-mail) + senha em texto. A regra
// da senha e do servidor — aqui so exige o preenchimento.
export const loginSchema = z.object({
  login: z.string().trim().min(1, "Informe o login."),
  password: z.string().min(1, "Informe a senha."),
});
