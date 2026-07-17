import { Suspense } from "react";

import PersonFormScreen from "../_screens/person-form-screen";

export default function PortalPersonNewPage() {
  return (
    <Suspense>
      <PersonFormScreen />
    </Suspense>
  );
}
