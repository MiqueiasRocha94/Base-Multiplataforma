import { resolveAuthUser } from "@/dev-backend/demo-users";
import { HttpError } from "@/lib/http";
import type { SessaoAcesso } from "@/types/acesso";

/**
 * DEV BACKEND — auth (`/auth/login|senha|esqueci-senha|me`). Usado pelo
 * `services/acesso` quando a API nao esta configurada.
 *
 * Reproduz o CONTRATO de `types/acesso` sobre os fixtures demo: a identidade
 * vem de `demo-users`. O token e stateless como um JWT: `mock.<base64(json)>`.
 *
 * Gatilho demo de senha expirada: entrar com a senha `expirada` (como a senha
 * recebida pelo "esqueci a senha", que ja vem expirada).
 */

const TTL_COMPLETO = 8 * 60 * 60;
const SENHA_EXPIRADA_DEMO = "expirada";

type MockToken = {
  login: string;
  senhaExpirada: boolean;
  exp: number;
};

function erro(codigo: number, message: string): HttpError {
  return new HttpError(codigo, { message, codigo, erros: [{ message, codigo }] }, message);
}

function emitir(payload: Omit<MockToken, "exp">, ttl: number): { token: string; expiresIn: number } {
  const token: MockToken = { ...payload, exp: Date.now() + ttl * 1000 };
  return { token: `mock.${btoa(JSON.stringify(token))}`, expiresIn: ttl };
}

function lerToken(token: string | undefined): MockToken {
  if (!token?.startsWith("mock.")) {
    throw erro(401, "Token inválido ou expirado.");
  }
  let parsed: MockToken;
  try {
    parsed = JSON.parse(atob(token.slice(5))) as MockToken;
  } catch {
    throw erro(401, "Token inválido ou expirado.");
  }
  if (parsed.exp < Date.now()) {
    throw erro(401, "Token inválido ou expirado.");
  }
  return parsed;
}

function sessao(login: string, senhaExpirada: boolean, comToken = true): SessaoAcesso {
  const user = resolveAuthUser(login);
  const resposta: SessaoAcesso = {
    id: Number(user.code),
    login,
    nome: user.name,
    email: user.email,
    telefone: user.phone,
    papeis: user.authorization.roles,
    permissoes: user.authorization.permissions,
    senhaExpirada,
  };
  if (comToken) {
    Object.assign(resposta, emitir({ login, senhaExpirada }, TTL_COMPLETO));
  }
  return resposta;
}

/** Simula a latencia da rede (e o render do estado "enviando"). */
const latencia = () => new Promise((resolve) => setTimeout(resolve, 250));

export async function devLogin(login: string, senha: string): Promise<SessaoAcesso> {
  await latencia();
  if (!login.trim() || !senha) {
    throw erro(400, "Informe login e senha.");
  }
  return sessao(login.trim().toLowerCase(), senha === SENHA_EXPIRADA_DEMO);
}

export async function devTrocarSenha(senhaAntiga: string, senha: string, token: string): Promise<SessaoAcesso> {
  await latencia();
  const atual = lerToken(token);
  // O mock nao guarda senhas: so recusa a atual vazia ou igual a nova.
  if (!senhaAntiga || senhaAntiga === senha) {
    throw erro(400, "A senha de acesso está incorreta.");
  }
  if (senha.length < 8 || !/[a-z]/i.test(senha) || !/\d/.test(senha)) {
    throw erro(400, "A senha deve ter no mínimo 8 caracteres, com letras e números.");
  }
  return sessao(atual.login, false);
}

/** Gatilhos demo: e-mail sem "@" → 400; login com "bloqueado" → 403. */
export async function devEsqueciSenha(login: string, email: string): Promise<void> {
  await latencia();
  if (!login.trim() || !email.trim()) {
    throw erro(400, "Informe login e e-mail.");
  }
  if (login.toLowerCase().includes("bloqueado")) {
    throw erro(403, "Conta bloqueada. Entre em contato com o suporte.");
  }
  if (!email.includes("@")) {
    throw erro(400, "Informações inválidas.");
  }
}

export async function devMe(token: string): Promise<SessaoAcesso> {
  await latencia();
  const atual = lerToken(token);
  return sessao(atual.login, atual.senhaExpirada, false);
}
