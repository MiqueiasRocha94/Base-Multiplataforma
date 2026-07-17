import { Suspense } from "react";

import PersonFormScreen from "../_screens/person-form-screen";

// Rota estatica de detalhe/edicao: o id vem por ?id=... (lido no cliente pelo
// PersonFormScreen). Diferente de um segmento [id], funciona com `output: export`.
export default function PortalPersonDetailPage() {
  return (
    <Suspense>
      <PersonFormScreen />
    </Suspense>
  );
}
