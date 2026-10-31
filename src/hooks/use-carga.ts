"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import type { AuthSession } from "@/lib/auth/session";
import { HttpError, isServerError, toError } from "@/lib/http";

type Resultado<T> = { chave: string; dados?: T; erro?: Error };

export type OpcoesCarga = {
  /**
   * Falha que a tela trata por conta própria (ex.: 403 → recarregar quem a
   * contém). `true` = tratada: nenhum erro é registrado e a carga fica pendente.
   */
  aoFalhar?: (falha: unknown) => boolean;
};

/**
 * Carga de dados de uma tela (docs/comunicacao-api.md → "Erros"): busca com a
 * sessão, descarta resposta atrasada, recarrega quando `chave` muda e em
 * `recarregar()`. `chave` nula = nada a carregar. 401 → logout; 5xx é lançado
 * no render (boundary da rota); 4xx e falha de rede voltam em `erro`, para a
 * tela decidir entre `LoadErrorScreen` (sem o que mostrar) e `LoadRetry` (bloco).
 */
export function useCarga<T>(
  chave: string | null,
  buscar: (session: AuthSession) => Promise<T>,
  opcoes: OpcoesCarga = {},
) {
  const { session, signOut } = useAuth();
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const atual = chave == null ? null : `${chave}#${versao}`;

  const carregar = useEffectEvent((sessao: AuthSession) => buscar(sessao));
  const tratada = useEffectEvent((falha: unknown) => opcoes.aoFalhar?.(falha) === true);

  useEffect(() => {
    if (!session || atual == null) return;
    let ativo = true;
    carregar(session).then(
      (dados) => {
        if (ativo) setResultado({ chave: atual, dados });
      },
      (falha: unknown) => {
        if (!ativo) return;
        if (falha instanceof HttpError && falha.status === 401) {
          signOut();
          return;
        }
        if (tratada(falha)) return;
        setResultado({ chave: atual, erro: toError(falha) });
      },
    );
    return () => {
      ativo = false;
    };
  }, [session, atual, signOut]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  const pronto = resultado != null && resultado.chave === atual;
  const erro = pronto ? (resultado.erro ?? null) : null;
  if (isServerError(erro)) throw erro;

  return {
    dados: pronto ? resultado.dados : undefined,
    erro,
    carregando: atual != null && !pronto,
    recarregar,
  };
}
