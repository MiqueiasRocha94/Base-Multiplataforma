"use client";

import { useState } from "react";
import { LucideTriangleAlert } from "lucide-react";
import { faker } from "@faker-js/faker";

import { StatusScreen } from "@/components/status-screen";

const responses = [
    { code: 500, message: "Internal Server Error" },
    { code: 501, message: "Not Implemented" },
    { code: 502, message: "Bad Gateway" },
    { code: 503, message: "Service Unavailable" },
    { code: 504, message: "Gateway Timeout" },
    { code: 507, message: "Insufficient Storage" },
];

export default function Demo500Page() {
    // Sorteada uma vez por montagem (fora do render, que precisa ser puro).
    const [response] = useState(() => responses[Math.floor(Math.random() * responses.length)]);

    return (
        <StatusScreen
            code={String(response.code)}
            tone="error"
            icon={<LucideTriangleAlert className="size-8" />}
            title={response.message}
            description={faker.lorem.words(15)}
            actions={[
                {
                    label: "Gerar outro erro",
                    onClick: () => window.location.reload(),
                },
            ]}
        />
    );
}