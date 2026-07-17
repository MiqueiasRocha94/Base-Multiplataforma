import { NotFoundContent } from "@/components/not-found-content";

/**
 * Catch-all de rotas não casadas. Sem ele, o roteador client do Next faz um
 * "hard navigation" (reload) ao cair numa rota inexistente — o que provoca o
 * flash da tela padrão e impede o overlay de cobrir. Aqui a rota EXISTE (como
 * catch-all), então a navegação é client-side e o 404 renderiza dentro do shell,
 * sem reload. Renderiza o conteúdo direto (sem `notFound()`) para não acionar o
 * Suspense do `loading.tsx`.
 *
 * `generateStaticParams` vazio mantém o export estático (mobile) válido — nenhuma
 * rota é pré-gerada por aqui; o 404.html continua vindo da `not-found`.
 */
export function generateStaticParams() {
  return [];
}

export default function CatchAllNotFound() {
  return <NotFoundContent />;
}
