import { DocumentationView } from "./_components/documentation-view";
import { loadDocumentation } from "@/lib/docs/load-docs";

// Server Component: lê README.md e todos os .md de docs/ em tempo de build
// (compatível com `output: "export"` do build mobile) e entrega o HTML já
// renderizado para a UI cliente.
export default function DocumentationPage() {
  const docs = loadDocumentation();

  return <DocumentationView docs={docs} />;
}
